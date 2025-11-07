# Browser Push Notifications - Quick Reference

## For Developers

### Import Utilities
```typescript
// Permission management
import {
  requestNotificationPermission,
  getPermissionState,
  shouldShowPermissionPrompt
} from './utils/notificationPermission';

// Browser notifications
import {
  showCriticalNotification,
  showBrowserNotification
} from './utils/browserNotification';

// Sound management
import {
  playNotificationSound,
  loadSoundSettings,
  testNotificationSound
} from './utils/notificationSound';
```

### Use the Hook
```typescript
import { useNotifications } from './hooks/useNotifications';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    permissionStatus,
    hasPermission,
    acknowledgeNotification
  } = useNotifications();
}
```

### Show Permission Prompt
```typescript
import { NotificationPermissionPrompt } from './components/notifications/NotificationPermissionPrompt';

<NotificationPermissionPrompt
  autoShow={true}
  onGranted={() => console.log('Granted')}
  onDenied={() => console.log('Denied')}
/>
```

## For Users

### Enable Notifications
1. Log in to the application
2. Click "Enable Notifications" when prompted
3. Click "Allow" in the browser permission dialog

### Configure Settings
1. Go to Settings → Notifications
2. Toggle notification channels (Email, SMS, In-App, Push)
3. Enable/disable sounds
4. Adjust volume
5. Configure Do Not Disturb hours

### If Notifications Are Blocked
**Chrome/Edge:**
1. Click the lock icon in address bar
2. Click "Site settings"
3. Find "Notifications"
4. Select "Allow"

**Firefox:**
1. Click the lock icon in address bar
2. Click "Permissions"
3. Find "Notifications"
4. Select "Allow"

## File Locations

### Components
- `viewer/src/components/notifications/NotificationPermissionPrompt.tsx`
- `viewer/src/components/notifications/NotificationSettings.tsx`
- `viewer/src/components/notifications/NotificationBell.tsx`
- `viewer/src/components/notifications/NotificationPanel.tsx`

### Utilities
- `viewer/src/utils/notificationPermission.ts`
- `viewer/src/utils/browserNotification.ts`
- `viewer/src/utils/notificationSound.ts`

### Hooks
- `viewer/src/hooks/useNotifications.ts`

### Assets
- Icons: `viewer/public/notification-*.svg`
- Sounds: `viewer/public/sounds/notification-*.mp3`

## Common Tasks

### Test Notification Permission
```typescript
import { getPermissionState } from './utils/notificationPermission';

const state = getPermissionState();
console.log('Permission:', state.permission);
console.log('Can request:', state.canRequest);
```

### Send Test Notification
```typescript
import { sendTestNotification } from './utils/browserNotification';

sendTestNotification(); // Shows "Test Notification"
```

### Test Sound
```typescript
import { testNotificationSound } from './utils/notificationSound';

await testNotificationSound('critical'); // Test critical sound
```

### Check Capabilities
```typescript
import { getNotificationCapabilities } from './utils/browserNotification';
import { getSoundCapabilities } from './utils/notificationSound';

const notifCaps = getNotificationCapabilities();
const soundCaps = await getSoundCapabilities();

console.log('Notification support:', notifCaps);
console.log('Sound support:', soundCaps);
```

## Troubleshooting

### Permission Issues
```typescript
// Reset permission state (for testing)
import { resetPermissionState } from './utils/notificationPermission';
resetPermissionState();
```

### Sound Issues
```typescript
// Check autoplay capability
import { checkAutoplayCapability } from './utils/notificationSound';

const canAutoplay = await checkAutoplayCapability();
console.log('Autoplay allowed:', canAutoplay);
```

### Debug Mode
```typescript
// Log all capabilities
import { logNotificationCapabilities } from './utils/browserNotification';
logNotificationCapabilities();
```

## Settings Storage

### LocalStorage Keys
- `notification_permission_state` - Permission state
- `notification_sound_settings` - Sound settings

### Clear Settings
```javascript
// In browser console
localStorage.removeItem('notification_permission_state');
localStorage.removeItem('notification_sound_settings');
```

## API Reference

### Permission Functions
- `getNotificationPermission()` - Get current permission
- `requestNotificationPermission()` - Request permission
- `getPermissionState()` - Get full permission state
- `shouldShowPermissionPrompt()` - Check if should show prompt

### Notification Functions
- `showBrowserNotification(options)` - Show notification
- `showCriticalNotification(notification, onNavigate)` - Show critical notification
- `closeAllNotifications()` - Close all notifications
- `getActiveNotifications()` - Get active notifications

### Sound Functions
- `playNotificationSound(type, options)` - Play sound
- `stopAllSounds()` - Stop all sounds
- `preloadNotificationSounds()` - Preload sounds
- `setNotificationSoundsEnabled(enabled)` - Enable/disable sounds
- `setNotificationVolume(volume)` - Set volume (0-1)

## Testing Checklist

- [ ] Permission request shows on login
- [ ] Permission prompt has correct content
- [ ] Permission denial handled gracefully
- [ ] Browser notifications appear
- [ ] Notification click works
- [ ] Sounds play for each severity
- [ ] Volume control works
- [ ] Sound enable/disable works
- [ ] Settings persist after refresh
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Edge
- [ ] Works on mobile (if applicable)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify browser supports notifications
3. Check browser notification settings
4. Review implementation documentation
5. Test with different browsers

## Resources

- [Implementation Guide](BROWSER_PUSH_NOTIFICATIONS_IMPLEMENTATION.md)
- [Notification Assets README](viewer/public/NOTIFICATION_ASSETS_README.md)
- [Sound Files README](viewer/public/sounds/SOUND_FILES_README.md)
