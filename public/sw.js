// Zanita Web Push Service Worker
// Standards-based service worker for Push API & Notifications API

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'Zanita',
      body: event.data.text(),
    };
  }

  const title = payload.title || 'Zanita';
  const scope = payload.scope || 'customer';
  const rawTargetUrl = payload.url || '/';

  // Strict same-origin sanitation (Section 11): reject external origins
  let safeTargetUrl = '/';
  try {
    const parsed = new URL(rawTargetUrl, self.location.origin);
    if (parsed.origin === self.location.origin) {
      safeTargetUrl = parsed.pathname + parsed.search;
    }
  } catch {
    safeTargetUrl = '/';
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || payload.eventKey || 'zanita-push',
    renotify: true,
    data: {
      url: safeTargetUrl,
      eventKey: payload.eventKey || null,
      scope,
      timestamp: Date.now(),
    },
  };

  // Visible Admin Duplication Prevention (Section 12):
  // If this is an admin alert AND there is an actively visible admin window,
  // the operator already receives in-app toasts, chime, and live order list updates.
  // Suppress the OS push only when admin is actively looking at the panel.
  const handlePush = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((windowClients) => {
      if (scope === 'admin') {
        const hasVisibleAdmin = windowClients.some((client) => {
          return (
            client.visibilityState === 'visible' &&
            client.url &&
            client.url.includes('/admin')
          );
        });
        if (hasVisibleAdmin) {
          return;
        }
      }
      return self.registration.showNotification(title, options);
    });

  event.waitUntil(handlePush);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || '/';

  // Strict same-origin navigation guard (Section 11)
  let targetPath = '/';
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) {
      targetPath = parsed.pathname + parsed.search;
    }
  } catch {
    targetPath = '/';
  }

  const fullTargetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // 1. If an existing window is at the target URL, focus it
        for (const client of windowClients) {
          if (client.url === fullTargetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // 2. If any client is open from our app origin, navigate to target and focus
        for (const client of windowClients) {
          if ('focus' in client && 'navigate' in client) {
            return client.navigate(fullTargetUrl).then(() => client.focus());
          }
        }
        // 3. Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullTargetUrl);
        }
      })
  );
});
