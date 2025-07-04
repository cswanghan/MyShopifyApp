import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { LogisticsEngine } from '~/lib/logistics-engine';

/**
 * 物流选项API端点
 * 为Checkout UI Extensions提供物流选项
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    const { origin, destination, package: packageInfo } = body;

    const logisticsEngine = new LogisticsEngine();

    // 获取物流选项
    const results = await logisticsEngine.getOptions({
      origin,
      destination,
      package: packageInfo,
      preferences: {
        isDDP: true,
        maxTransitTime: 30,
        trackingRequired: true
      }
    });

    // 格式化返回结果
    const options = results.options.map(option => ({
      id: option.id,
      provider: option.provider,
      service: option.service,
      cost: option.cost,
      timeMin: option.timeMin,
      timeMax: option.timeMax,
      trackingIncluded: option.trackingIncluded,
      insuranceIncluded: option.insuranceIncluded,
      ddpSupported: option.ddpSupported,
      recommended: option.recommended,
      description: getServiceDescription(option.provider, option.service),
      features: getServiceFeatures(option)
    }));

    return json(options);

  } catch (error) {
    console.error('物流选项API错误:', error);
    
    return json({
      error: error.message || '获取物流选项失败',
      options: []
    }, { status: 500 });
  }
}

/**
 * 获取服务描述
 */
function getServiceDescription(provider: string, service: string): string {
  const descriptions: Record<string, string> = {
    'DHL_ECOMMERCE': '经济实惠的国际小包服务',
    'DHL_EXPRESS': '快速可靠的国际快递服务',
    'FEDEX_ECONOMY': '经济型国际配送服务',
    'FEDEX_EXPRESS': '快速国际快递服务',
    'UPS_STANDARD': '标准国际配送服务',
    'UPS_EXPRESS': '快速国际快递服务',
    'YUNEXPRESS_ECONOMIC': '经济型专线物流服务',
    'YUNEXPRESS_EXPRESS': '快速专线物流服务',
    'YANWEN_ECONOMIC': '经济型国际小包服务',
    'YANWEN_EXPRESS': '快速国际小包服务',
    'EMS_STANDARD': '邮政国际快递服务',
    'SF_EXPRESS': '顺丰国际快递服务'
  };
  
  const key = `${provider}_${service}`.toUpperCase();
  return descriptions[key] || '国际物流配送服务';
}

/**
 * 获取服务特性
 */
function getServiceFeatures(option: any): string[] {
  const features: string[] = [];
  
  if (option.trackingIncluded) {
    features.push('包含跟踪');
  }
  
  if (option.insuranceIncluded) {
    features.push('包含保险');
  }
  
  if (option.ddpSupported) {
    features.push('支持DDP');
  }
  
  if (option.timeMin <= 5) {
    features.push('快速送达');
  }
  
  if (option.cost < 10) {
    features.push('经济实惠');
  }
  
  if (option.recommended) {
    features.push('推荐方案');
  }
  
  return features;
}