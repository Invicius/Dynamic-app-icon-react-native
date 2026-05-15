#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ReactNativeDynamicAppIcon, NSObject)

RCT_EXTERN_METHOD(changeIcon:(NSString *)iconName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getIcon:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
