import UIKit
import React

@objc(ReactNativeDynamicAppIcon)
class ReactNativeDynamicAppIcon: NSObject {

  private static let defaultIconName = "DefaultIcon"

  @objc
  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc(changeIcon:resolver:rejecter:)
  func changeIcon(
    _ iconName: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard UIApplication.shared.supportsAlternateIcons else {
        reject("UNSUPPORTED", "Alternate icons are not supported on this device", nil)
        return
      }

      let trimmed = iconName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      let alternateName: String?
      if trimmed.isEmpty || trimmed == Self.defaultIconName {
        alternateName = nil
      } else {
        alternateName = trimmed
      }

      if UIApplication.shared.alternateIconName == alternateName {
        resolve(nil)
        return
      }

      UIApplication.shared.setAlternateIconName(alternateName) { error in
        if let error {
          reject("CHANGE_ICON_ERROR", error.localizedDescription, error)
        } else {
          resolve(nil)
        }
      }
    }
  }

  @objc(getIcon:rejecter:)
  func getIcon(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if let name = UIApplication.shared.alternateIconName {
        resolve(name)
      } else {
        resolve(Self.defaultIconName)
      }
    }
  }
}
