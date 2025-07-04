import React, { useState, useEffect } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Button,
  Checkbox,
  Divider,
  InlineLayout,
  Text,
  useCartLines,
  useShippingAddress,
  useApplyAttributeChange,
  useApi,
  useTranslate
} from '@shopify/checkout-ui-extensions-react';

/**
 * DTax-Bridge主要Checkout组件
 * 提供税费计算和物流选择功能
 */
export default reactExtension(
  'purchase.checkout.block.render',
  () => <DTaxBridgeCheckout />
);

function DTaxBridgeCheckout() {
  const { i18n } = useApi();
  const translate = useTranslate();
  const cartLines = useCartLines();
  const shippingAddress = useShippingAddress();
  const applyAttributeChange = useApplyAttributeChange();
  
  const [taxCalculation, setTaxCalculation] = useState(null);
  const [logisticsOptions, setLogisticsOptions] = useState([]);
  const [selectedLogistics, setSelectedLogistics] = useState(null);
  const [isDDPSelected, setIsDDPSelected] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  // 当购物车或地址改变时重新计算
  useEffect(() => {
    if (cartLines.length > 0 && shippingAddress?.countryCode) {
      calculateTaxAndLogistics();
    }
  }, [cartLines, shippingAddress, isDDPSelected]);

  /**
   * 计算税费和物流选项
   */
  const calculateTaxAndLogistics = async () => {
    setIsCalculating(true);
    setError(null);
    
    try {
      // 构建计算请求
      const calculationRequest = {
        cart: {
          lines: cartLines.map(line => ({
            id: line.id,
            quantity: line.quantity,
            variant: {
              id: line.merchandise.id,
              title: line.merchandise.title,
              price: line.merchandise.price.amount,
              product: {
                id: line.merchandise.product.id,
                title: line.merchandise.product.title,
                type: line.merchandise.product.productType,
                vendor: line.merchandise.product.vendor,
                tags: line.merchandise.product.tags
              }
            }
          })),
          totalAmount: cartLines.reduce((sum, line) => 
            sum + (line.quantity * parseFloat(line.merchandise.price.amount)), 0
          )
        },
        destination: {
          countryCode: shippingAddress.countryCode,
          provinceCode: shippingAddress.provinceCode,
          city: shippingAddress.city,
          zip: shippingAddress.zip
        },
        preferences: {
          isDDP: isDDPSelected,
          language: i18n.language
        }
      };

      // 调用计算API
      const response = await fetch('/api/calculate-tax-logistics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calculationRequest)
      });

      if (!response.ok) {
        throw new Error(`计算失败: ${response.statusText}`);
      }

      const result = await response.json();
      setTaxCalculation(result.taxes);
      setLogisticsOptions(result.logistics);
      
      // 自动选择推荐的物流方案
      if (result.logistics.length > 0) {
        const recommended = result.logistics.find(opt => opt.recommended) || result.logistics[0];
        setSelectedLogistics(recommended);
      }

    } catch (err) {
      console.error('税费计算错误:', err);
      setError(err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  /**
   * 处理DDP/DAP切换
   */
  const handleDDPToggle = (checked) => {
    setIsDDPSelected(checked);
    
    // 保存用户选择到checkout attributes
    applyAttributeChange({
      type: 'updateAttribute',
      key: 'dtax_bridge_ddp',
      value: checked.toString()
    });
  };

  /**
   * 处理物流方案选择
   */
  const handleLogisticsChange = (option) => {
    setSelectedLogistics(option);
    
    // 保存选择到checkout attributes
    applyAttributeChange({
      type: 'updateAttribute',
      key: 'dtax_bridge_logistics',
      value: JSON.stringify({
        provider: option.provider,
        service: option.service,
        cost: option.cost,
        timeMin: option.timeMin,
        timeMax: option.timeMax
      })
    });
  };

  if (error) {
    return (
      <Banner status="critical">
        <Text>税费计算出错: {error}</Text>
      </Banner>
    );
  }

  return (
    <BlockStack spacing="base">
      {/* 标题 */}
      <Text size="medium" emphasis="strong">
        🌍 DTax-Bridge 跨境税费 & 物流
      </Text>
      
      {/* DDP/DAP选择 */}
      <BlockStack spacing="tight">
        <Checkbox
          checked={isDDPSelected}
          onChange={handleDDPToggle}
        >
          启用DDP模式 (含税到门价)
        </Checkbox>
        <Text size="small" appearance="subdued">
          {isDDPSelected 
            ? '✅ 包含所有税费，无需额外付费' 
            : '⚠️ 可能需要在收货时缴纳税费'}
        </Text>
      </BlockStack>

      <Divider />

      {/* 税费计算结果 */}
      {isCalculating ? (
        <Text>🔄 正在计算税费...</Text>
      ) : taxCalculation ? (
        <BlockStack spacing="tight">
          <Text size="small" emphasis="strong">预估税费明细:</Text>
          {taxCalculation.map((tax, index) => (
            <InlineLayout key={index} spacing="loose">
              <Text size="small">{tax.name}</Text>
              <Text size="small">
                {tax.rate}% (${tax.amount.toFixed(2)})
              </Text>
            </InlineLayout>
          ))}
          <InlineLayout spacing="loose">
            <Text size="small" emphasis="strong">总计税费:</Text>
            <Text size="small" emphasis="strong">
              ${taxCalculation.reduce((sum, tax) => sum + tax.amount, 0).toFixed(2)}
            </Text>
          </InlineLayout>
        </BlockStack>
      ) : null}

      {/* 物流选项 */}
      {logisticsOptions.length > 0 && (
        <BlockStack spacing="tight">
          <Text size="small" emphasis="strong">推荐物流方案:</Text>
          {logisticsOptions.slice(0, 3).map((option, index) => (
            <InlineLayout key={index} spacing="loose">
              <Checkbox
                checked={selectedLogistics?.id === option.id}
                onChange={() => handleLogisticsChange(option)}
              >
                <BlockStack spacing="extraTight">
                  <Text size="small" emphasis="strong">
                    {option.provider} - {option.service}
                  </Text>
                  <Text size="small" appearance="subdued">
                    ${option.cost.toFixed(2)} | {option.timeMin}-{option.timeMax}天
                  </Text>
                  {option.recommended && (
                    <Text size="small" appearance="accent">⭐ 推荐</Text>
                  )}
                </BlockStack>
              </Checkbox>
            </InlineLayout>
          ))}
        </BlockStack>
      )}

      {/* 重新计算按钮 */}
      <Button
        kind="secondary"
        onPress={calculateTaxAndLogistics}
        loading={isCalculating}
        disabled={!shippingAddress?.countryCode}
      >
        🔄 重新计算
      </Button>

      {/* 总价预览 */}
      {taxCalculation && selectedLogistics && (
        <BlockStack spacing="tight">
          <Divider />
          <InlineLayout spacing="loose">
            <Text size="medium" emphasis="strong">
              预估总价 (含税含运费):
            </Text>
            <Text size="medium" emphasis="strong" appearance="accent">
              ${(
                cartLines.reduce((sum, line) => 
                  sum + (line.quantity * parseFloat(line.merchandise.price.amount)), 0
                ) +
                taxCalculation.reduce((sum, tax) => sum + tax.amount, 0) +
                selectedLogistics.cost
              ).toFixed(2)}
            </Text>
          </InlineLayout>
        </BlockStack>
      )}
    </BlockStack>
  );
}