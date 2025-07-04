import React, { useState, useEffect } from 'react';
import {
  reactExtension,
  Banner,
  InlineLayout,
  Text,
  useCartLines,
  useShippingAddress,
  useApi
} from '@shopify/checkout-ui-extensions-react';

/**
 * 税费提醒横幅组件
 * 显示在配送地址上方，提醒用户税费情况
 */
export default reactExtension(
  'purchase.checkout.delivery-address.render-before',
  () => <TaxBanner />
);

function TaxBanner() {
  const { i18n } = useApi();
  const cartLines = useCartLines();
  const shippingAddress = useShippingAddress();
  
  const [taxInfo, setTaxInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (shippingAddress?.countryCode && cartLines.length > 0) {
      calculateTaxInfo();
    }
  }, [shippingAddress, cartLines]);

  const calculateTaxInfo = async () => {
    try {
      const totalAmount = cartLines.reduce((sum, line) => 
        sum + (line.quantity * parseFloat(line.merchandise.price.amount)), 0
      );

      const countryCode = shippingAddress.countryCode;
      const taxData = getTaxInfoByCountry(countryCode, totalAmount);
      
      setTaxInfo(taxData);
      setIsVisible(taxData.showBanner);
    } catch (error) {
      console.error('税费信息计算错误:', error);
      setIsVisible(false);
    }
  };

  const getTaxInfoByCountry = (countryCode, totalAmount) => {
    const euCountries = [
      'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'PT', 'CZ', 'HU', 'GR',
      'SE', 'DK', 'FI', 'SK', 'IE', 'HR', 'LT', 'SI', 'LV', 'EE', 'CY', 'LU', 'MT'
    ];

    if (euCountries.includes(countryCode)) {
      // EU国家
      const vatRate = getVATRate(countryCode);
      const isIOSSApplicable = totalAmount <= 150;
      
      return {
        showBanner: true,
        status: isIOSSApplicable ? 'info' : 'warning',
        title: isIOSSApplicable ? '✅ 已包含欧盟税费' : '⚠️ 可能需要缴纳额外税费',
        message: isIOSSApplicable 
          ? `订单将通过IOSS申报，已包含${vatRate}%的增值税`
          : `订单超过€150，可能需要在收货时缴纳${vatRate}%的增值税和进口关税`,
        details: {
          vatRate,
          threshold: 150,
          isIOSSApplicable
        }
      };
    }

    if (countryCode === 'GB') {
      // 英国
      const vatRate = 20;
      const isUnderThreshold = totalAmount <= 135;
      
      return {
        showBanner: true,
        status: isUnderThreshold ? 'info' : 'warning',
        title: isUnderThreshold ? '✅ 已包含英国税费' : '⚠️ 可能需要缴纳额外税费',
        message: isUnderThreshold
          ? `订单已包含${vatRate}%的英国增值税`
          : `订单超过£135，可能需要在收货时缴纳${vatRate}%的VAT和进口关税`,
        details: {
          vatRate,
          threshold: 135,
          isUnderThreshold
        }
      };
    }

    if (countryCode === 'US') {
      // 美国
      const isSection321 = totalAmount <= 800;
      
      return {
        showBanner: true,
        status: isSection321 ? 'success' : 'warning',
        title: isSection321 ? '✅ 免征关税' : '⚠️ 可能需要缴纳关税',
        message: isSection321
          ? '订单符合Section 321规定，免征关税和税费'
          : '订单超过$800，可能需要缴纳进口关税',
        details: {
          threshold: 800,
          isSection321
        }
      };
    }

    // 其他国家
    return {
      showBanner: true,
      status: 'info',
      title: '🌍 国际配送',
      message: '根据目的地国家的法律法规，您可能需要缴纳进口税费',
      details: {
        message: '具体税费将根据当地海关规定确定'
      }
    };
  };

  const getVATRate = (countryCode) => {
    const vatRates = {
      'DE': 19, 'FR': 20, 'IT': 22, 'ES': 21, 'NL': 21, 'BE': 21,
      'AT': 20, 'PL': 23, 'PT': 23, 'CZ': 21, 'HU': 27, 'GR': 24,
      'SE': 25, 'DK': 25, 'FI': 24, 'SK': 20, 'IE': 23, 'HR': 25,
      'LT': 21, 'SI': 22, 'LV': 21, 'EE': 20, 'CY': 19, 'LU': 17, 'MT': 18
    };
    return vatRates[countryCode] || 20;
  };

  if (!isVisible || !taxInfo) {
    return null;
  }

  return (
    <Banner status={taxInfo.status}>
      <InlineLayout spacing="loose">
        <Text size="medium" emphasis="strong">
          {taxInfo.title}
        </Text>
      </InlineLayout>
      <Text size="small">
        {taxInfo.message}
      </Text>
      {taxInfo.details && (
        <Text size="extraSmall" appearance="subdued">
          💡 使用DTax-Bridge获得精确的税费计算和最优物流方案
        </Text>
      )}
    </Banner>
  );
}