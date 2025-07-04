/**
 * DTax-Bridge Shopify Functions税费计算扩展
 * 处理跨境订单的税费和关税计算
 */

import { DiscountApplicationStrategy } from '@shopify/shopify-functions';

export default function taxCalculator(input) {
  const { cart, discountNode } = input;
  
  // 获取买家国家代码
  const buyerCountry = cart.buyerIdentity?.countryCode || 'US';
  
  // 获取扩展配置
  const config = discountNode?.metafield?.value 
    ? JSON.parse(discountNode.metafield.value)
    : { enableTaxCalculation: true, enableIOSS: true };
  
  if (!config.enableTaxCalculation) {
    return {
      discountApplicationStrategy: DiscountApplicationStrategy.First,
      discounts: []
    };
  }
  
  // 计算税费
  const taxCalculations = calculateTaxes(cart, buyerCountry, config);
  
  // 返回折扣/税费结果
  return {
    discountApplicationStrategy: DiscountApplicationStrategy.First,
    discounts: taxCalculations.map(calc => ({
      message: calc.message,
      targets: [
        {
          orderSubtotal: {
            excludedVariantIds: []
          }
        }
      ],
      value: {
        percentage: {
          value: calc.percentage
        }
      }
    }))
  };
}

/**
 * 计算税费
 */
function calculateTaxes(cart, buyerCountry, config) {
  const calculations = [];
  const totalAmount = parseFloat(cart.cost.totalAmount.amount);
  
  // EU国家VAT计算
  const euCountries = [
    'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'PT', 'CZ', 'HU', 'GR',
    'SE', 'DK', 'FI', 'SK', 'IE', 'HR', 'LT', 'SI', 'LV', 'EE', 'CY', 'LU', 'MT'
  ];
  
  if (euCountries.includes(buyerCountry)) {
    // EU VAT计算
    const vatRate = getEUVATRate(buyerCountry, cart.lines);
    const vatAmount = totalAmount * (vatRate / 100);
    
    if (config.enableIOSS && totalAmount <= 150) {
      // IOSS适用 - 税费已包含
      calculations.push({
        message: `已包含${buyerCountry} VAT (${vatRate}%) - IOSS申报`,
        percentage: 0,
        amount: vatAmount,
        type: 'vat_included'
      });
    } else {
      // 需要额外征收VAT
      calculations.push({
        message: `${buyerCountry} VAT (${vatRate}%)`,
        percentage: vatRate,
        amount: vatAmount,
        type: 'vat_additional'
      });
    }
  }
  
  // 英国VAT计算
  if (buyerCountry === 'GB') {
    const ukVatRate = getUKVATRate(cart.lines);
    const vatAmount = totalAmount * (ukVatRate / 100);
    
    calculations.push({
      message: `英国 VAT (${ukVatRate}%)`,
      percentage: ukVatRate,
      amount: vatAmount,
      type: 'uk_vat'
    });
  }
  
  // 美国关税计算
  if (buyerCountry === 'US') {
    const dutyCalculation = calculateUSDuty(cart.lines, totalAmount);
    if (dutyCalculation.amount > 0) {
      calculations.push({
        message: `美国进口关税 (${dutyCalculation.rate}%)`,
        percentage: dutyCalculation.rate,
        amount: dutyCalculation.amount,
        type: 'us_duty'
      });
    }
    
    // Section 321 de minimis检查
    if (totalAmount <= 800) {
      calculations.push({
        message: '免征关税 (Section 321 de minimis)',
        percentage: 0,
        amount: 0,
        type: 'section_321'
      });
    }
  }
  
  return calculations;
}

/**
 * 获取EU VAT税率
 */
function getEUVATRate(country, lines) {
  // 基础VAT税率表
  const vatRates = {
    'DE': 19, 'FR': 20, 'IT': 22, 'ES': 21, 'NL': 21, 'BE': 21,
    'AT': 20, 'PL': 23, 'PT': 23, 'CZ': 21, 'HU': 27, 'GR': 24,
    'SE': 25, 'DK': 25, 'FI': 24, 'SK': 20, 'IE': 23, 'HR': 25,
    'LT': 21, 'SI': 22, 'LV': 21, 'EE': 20, 'CY': 19, 'LU': 17, 'MT': 18
  };
  
  // 检查是否有特殊商品类型的优惠税率
  const hasBooks = lines.some(line => 
    line.merchandise.product?.productType?.toLowerCase().includes('book')
  );
  
  const hasFood = lines.some(line => 
    line.merchandise.product?.tags?.some(tag => 
      tag.toLowerCase().includes('food') || tag.toLowerCase().includes('beverage')
    )
  );
  
  let rate = vatRates[country] || 20;
  
  // 部分商品优惠税率
  if (hasBooks && ['DE', 'FR', 'IT'].includes(country)) {
    rate = 7; // 图书优惠税率
  } else if (hasFood && ['DE', 'FR', 'ES'].includes(country)) {
    rate = 10; // 食品优惠税率
  }
  
  return rate;
}

/**
 * 获取UK VAT税率
 */
function getUKVATRate(lines) {
  const hasBooks = lines.some(line => 
    line.merchandise.product?.productType?.toLowerCase().includes('book')
  );
  
  const hasFood = lines.some(line => 
    line.merchandise.product?.tags?.some(tag => 
      tag.toLowerCase().includes('food')
    )
  );
  
  // 英国VAT税率
  if (hasBooks || hasFood) {
    return 0; // 图书和基础食品免税
  }
  
  return 20; // 标准税率
}

/**
 * 计算美国关税
 */
function calculateUSDuty(lines, totalAmount) {
  let totalDuty = 0;
  let averageRate = 0;
  
  lines.forEach(line => {
    const product = line.merchandise.product;
    const quantity = line.quantity;
    const unitPrice = parseFloat(line.merchandise.price.amount);
    const lineValue = quantity * unitPrice;
    
    // 根据商品类型确定关税税率
    let dutyRate = 0;
    
    const productType = product?.productType?.toLowerCase() || '';
    const tags = product?.tags || [];
    
    if (productType.includes('clothing') || productType.includes('apparel')) {
      dutyRate = 16.5; // 服装类
    } else if (productType.includes('electronics') || productType.includes('tech')) {
      dutyRate = 0; // 电子产品大多免税
    } else if (productType.includes('shoes') || productType.includes('footwear')) {
      dutyRate = 37.5; // 鞋类
    } else if (productType.includes('bags') || productType.includes('handbags')) {
      dutyRate = 17.6; // 箱包类
    } else if (tags.some(tag => tag.toLowerCase().includes('jewelry'))) {
      dutyRate = 5.5; // 珠宝类
    } else {
      dutyRate = 5.63; // 其他商品平均税率
    }
    
    const lineDuty = lineValue * (dutyRate / 100);
    totalDuty += lineDuty;
  });
  
  averageRate = totalAmount > 0 ? (totalDuty / totalAmount) * 100 : 0;
  
  return {
    amount: totalDuty,
    rate: Math.round(averageRate * 100) / 100
  };
}