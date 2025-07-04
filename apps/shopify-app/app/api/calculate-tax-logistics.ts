import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { TaxCalculationEngine } from '~/lib/tax-engine';
import { LogisticsEngine } from '~/lib/logistics-engine';

/**
 * 税费和物流计算API端点
 * 为Checkout UI Extensions提供计算服务
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    const { cart, destination, preferences } = body;

    // 初始化引擎
    const taxEngine = new TaxCalculationEngine();
    const logisticsEngine = new LogisticsEngine();

    // 计算税费
    const taxResults = await taxEngine.calculate({
      items: cart.lines.map((line: any) => ({
        id: line.id,
        quantity: line.quantity,
        price: parseFloat(line.variant.price),
        title: line.variant.title,
        productType: line.variant.product.type,
        vendor: line.variant.product.vendor,
        tags: line.variant.product.tags,
        hsCode: extractHSCode(line.variant.product),
        weight: extractWeight(line.variant.product) || 0.5 // 默认0.5kg
      })),
      destination: {
        countryCode: destination.countryCode,
        provinceCode: destination.provinceCode,
        city: destination.city,
        postalCode: destination.zip
      },
      preferences: {
        useIOSS: preferences.isDDP && isIOSSApplicable(destination.countryCode, cart.totalAmount),
        includeDuties: preferences.isDDP,
        language: preferences.language || 'zh-CN'
      }
    });

    // 计算物流选项
    const logisticsResults = await logisticsEngine.getOptions({
      origin: {
        countryCode: 'CN',
        city: 'Shenzhen'
      },
      destination: {
        countryCode: destination.countryCode,
        provinceCode: destination.provinceCode,
        city: destination.city,
        postalCode: destination.zip
      },
      package: {
        weight: cart.lines.reduce((sum: number, line: any) => 
          sum + (line.quantity * (extractWeight(line.variant.product) || 0.5)), 0
        ),
        value: cart.totalAmount,
        currency: 'USD',
        dimensions: {
          length: 20,
          width: 15,
          height: 10,
          unit: 'cm'
        }
      },
      preferences: {
        isDDP: preferences.isDDP,
        maxTransitTime: 15,
        trackingRequired: true
      }
    });

    // 格式化返回结果
    const response = {
      success: true,
      taxes: taxResults.taxes.map(tax => ({
        name: tax.name,
        type: tax.type,
        rate: tax.rate,
        amount: tax.amount,
        description: tax.description,
        isIOSS: tax.isIOSS || false
      })),
      logistics: logisticsResults.options.map(option => ({
        id: option.id,
        provider: option.provider,
        service: option.service,
        cost: option.cost,
        timeMin: option.timeMin,
        timeMax: option.timeMax,
        trackingIncluded: option.trackingIncluded,
        insuranceIncluded: option.insuranceIncluded,
        ddpSupported: option.ddpSupported,
        recommended: option.recommended
      })),
      summary: {
        totalTax: taxResults.taxes.reduce((sum, tax) => sum + tax.amount, 0),
        recommendedLogistics: logisticsResults.options.find(opt => opt.recommended),
        estimatedTotal: cart.totalAmount + 
          taxResults.taxes.reduce((sum, tax) => sum + tax.amount, 0) +
          (logisticsResults.options.find(opt => opt.recommended)?.cost || 0)
      }
    };

    return json(response);

  } catch (error) {
    console.error('计算API错误:', error);
    
    return json({
      success: false,
      error: error.message || '计算失败',
      taxes: [],
      logistics: [],
      summary: {
        totalTax: 0,
        estimatedTotal: 0
      }
    }, { status: 500 });
  }
}

/**
 * 提取HSCode
 */
function extractHSCode(product: any): string {
  // 从商品标签或自定义字段中提取HSCode
  const hsCodeTag = product.tags?.find((tag: string) => 
    tag.toLowerCase().startsWith('hscode:')
  );
  
  if (hsCodeTag) {
    return hsCodeTag.split(':')[1];
  }
  
  // 根据商品类型推断HSCode
  const productType = product.type?.toLowerCase() || '';
  
  if (productType.includes('clothing') || productType.includes('apparel')) {
    return '6204'; // 服装类
  } else if (productType.includes('electronics')) {
    return '8517'; // 电子产品
  } else if (productType.includes('shoes')) {
    return '6403'; // 鞋类
  } else if (productType.includes('bags')) {
    return '4202'; // 箱包类
  }
  
  return '9999'; // 其他商品
}

/**
 * 提取重量
 */
function extractWeight(product: any): number | null {
  // 从商品标签中提取重量
  const weightTag = product.tags?.find((tag: string) => 
    tag.toLowerCase().startsWith('weight:')
  );
  
  if (weightTag) {
    const weight = parseFloat(weightTag.split(':')[1]);
    return isNaN(weight) ? null : weight;
  }
  
  return null;
}

/**
 * 判断是否适用IOSS
 */
function isIOSSApplicable(countryCode: string, totalAmount: number): boolean {
  const euCountries = [
    'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'PT', 'CZ', 'HU', 'GR',
    'SE', 'DK', 'FI', 'SK', 'IE', 'HR', 'LT', 'SI', 'LV', 'EE', 'CY', 'LU', 'MT'
  ];
  
  return euCountries.includes(countryCode) && totalAmount <= 150;
}