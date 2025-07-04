import React, { useState, useEffect } from 'react';
import {
  reactExtension,
  BlockStack,
  Button,
  Checkbox,
  InlineLayout,
  Text,
  useCartLines,
  useShippingAddress,
  useApplyAttributeChange
} from '@shopify/checkout-ui-extensions-react';

/**
 * 物流选项组件
 * 显示在配送选项列表后，提供额外的物流选择
 */
export default reactExtension(
  'purchase.checkout.shipping-option-list.render-after',
  () => <LogisticsOptions />
);

function LogisticsOptions() {
  const cartLines = useCartLines();
  const shippingAddress = useShippingAddress();
  const applyAttributeChange = useApplyAttributeChange();
  
  const [logisticsOptions, setLogisticsOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (shippingAddress?.countryCode && cartLines.length > 0) {
      fetchLogisticsOptions();
    }
  }, [shippingAddress, cartLines]);

  const fetchLogisticsOptions = async () => {
    setIsLoading(true);
    
    try {
      const totalWeight = cartLines.reduce((sum, line) => {
        // 假设每个商品重量为0.5kg（实际应该从产品数据获取）
        return sum + (line.quantity * 0.5);
      }, 0);

      const totalValue = cartLines.reduce((sum, line) => 
        sum + (line.quantity * parseFloat(line.merchandise.price.amount)), 0
      );

      const requestData = {
        origin: {
          countryCode: 'CN',
          city: 'Shenzhen'
        },
        destination: {
          countryCode: shippingAddress.countryCode,
          provinceCode: shippingAddress.provinceCode,
          city: shippingAddress.city,
          zip: shippingAddress.zip
        },
        package: {
          weight: totalWeight,
          value: totalValue,
          currency: 'USD'
        }
      };

      const response = await fetch('/api/logistics-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const options = await response.json();
        setLogisticsOptions(options);
      }
    } catch (error) {
      console.error('获取物流选项错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    
    // 保存选择到checkout attributes
    applyAttributeChange({
      type: 'updateAttribute',
      key: 'dtax_bridge_logistics_premium',
      value: JSON.stringify({
        provider: option.provider,
        service: option.service,
        cost: option.cost,
        timeMin: option.timeMin,
        timeMax: option.timeMax,
        trackingIncluded: option.trackingIncluded,
        insuranceIncluded: option.insuranceIncluded
      })
    });
  };

  const getProviderIcon = (provider) => {
    const icons = {
      'DHL': '🚚',
      'FedEx': '✈️',
      'UPS': '📦',
      'YunExpress': '🌐',
      'Yanwen': '🚛',
      'SF Express': '⚡',
      'EMS': '📮'
    };
    return icons[provider] || '🚚';
  };

  const getServiceDescription = (option) => {
    const descriptions = {
      'DHL eCommerce': '经济实惠，适合轻小包裹',
      'DHL Express': '快速专递，2-3天送达',
      'FedEx Economy': '经济型国际快递',
      'UPS Standard': '标准配送服务',
      'YunExpress Economic': '经济型专线',
      'Yanwen Special': '专线物流，性价比高'
    };
    return descriptions[option.service] || '国际物流配送';
  };

  if (!shippingAddress?.countryCode || logisticsOptions.length === 0) {
    return null;
  }

  return (
    <BlockStack spacing="base">
      <Button
        kind="secondary"
        onPress={() => setIsExpanded(!isExpanded)}
        loading={isLoading}
      >
        {isExpanded ? '收起' : '查看更多物流选项'} 
        {logisticsOptions.length > 0 && ` (${logisticsOptions.length})`}
      </Button>

      {isExpanded && (
        <BlockStack spacing="tight">
          <Text size="small" emphasis="strong">
            🌍 DTax-Bridge 国际物流方案
          </Text>
          
          {logisticsOptions.map((option, index) => (
            <BlockStack key={index} spacing="extraTight">
              <InlineLayout spacing="loose">
                <Checkbox
                  checked={selectedOption?.id === option.id}
                  onChange={() => handleOptionSelect(option)}
                >
                  <BlockStack spacing="extraTight">
                    <InlineLayout spacing="tight">
                      <Text size="small">
                        {getProviderIcon(option.provider)} {option.provider}
                      </Text>
                      <Text size="small" emphasis="strong">
                        {option.service}
                      </Text>
                    </InlineLayout>
                    
                    <Text size="small" appearance="subdued">
                      {getServiceDescription(option)}
                    </Text>
                    
                    <InlineLayout spacing="loose">
                      <Text size="small">
                        💰 ${option.cost.toFixed(2)}
                      </Text>
                      <Text size="small">
                        ⏱️ {option.timeMin}-{option.timeMax}天
                      </Text>
                    </InlineLayout>
                    
                    <InlineLayout spacing="tight">
                      {option.trackingIncluded && (
                        <Text size="extraSmall" appearance="accent">
                          ✅ 包含跟踪
                        </Text>
                      )}
                      {option.insuranceIncluded && (
                        <Text size="extraSmall" appearance="accent">
                          ✅ 包含保险
                        </Text>
                      )}
                      {option.ddpSupported && (
                        <Text size="extraSmall" appearance="accent">
                          ✅ 支持DDP
                        </Text>
                      )}
                    </InlineLayout>
                  </BlockStack>
                </Checkbox>
              </InlineLayout>
            </BlockStack>
          ))}
          
          <Text size="extraSmall" appearance="subdued">
            💡 选择物流方案后，相关费用将添加到总价中
          </Text>
        </BlockStack>
      )}
    </BlockStack>
  );
}