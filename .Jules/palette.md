## 2024-05-24 - Theme-Aware Auth Screen & Loading States
**Learning:** Authentication screens are often overlooked in theme systems, leading to a jarring visual transition when a user with a stored theme preference logs out or visits the sign-in page. Providing immediate feedback on primary action buttons (loading state) is crucial to prevent double-submissions and reduce perceived latency.
**Action:** Always verify that the Auth/Splash screens consume the global theme context. Ensure every network-bound action button has a clear disabled/loading state.
