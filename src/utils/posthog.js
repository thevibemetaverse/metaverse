import posthog from 'posthog-js'

// Initialize PostHog
export function initPostHog() {
  if (typeof window !== 'undefined') {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: false
    })
  }
}

// Track page views
export function trackPageView() {
  if (typeof window !== 'undefined') {
    const url = window.location.href
    posthog.capture('$pageview', { '$current_url': url })
  }
}

// Track custom events
export function trackEvent(eventName, properties = {}) {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, properties)
  }
} 