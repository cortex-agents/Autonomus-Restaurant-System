# Restaurant Owner Dashboard Frontend Design

## Overview
This document describes the frontend owner dashboard for the Autonomus Restaurant System - a multi-tenant SaaS platform that enables restaurants to manage their WhatsApp-based order-taking AI agent.

## Target Users
Restaurant owners and managers who need to:
- View and manage incoming orders
- Edit and categorize menu items
- Configure restaurant settings (hours, delivery, minimum order)
- Handle customer escalations and complaints

## Core Features (Prioritized)
1. **Order Management** - Live order feed with status updates
2. **Menu Management** - Full CRUD for menu items with categories, variants, and addons
3. **Settings & Configuration** - Restaurant operational settings
4. **Escalation Handling** - View and respond to customer escalations

## Technology Stack
- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **API Communication**: Custom typed fetch wrapper with automatic JWT handling
- **Real-time Updates**: Polling fallback for `/api/orders/live` (WebSocket if implemented in backend)
- **UI Components**: Custom components built with Radix UI primitives or Headless UI

## Architecture

### File Structure
```
frontend/
├── app/
│   ├── layout.tsx              # Root layout (providers, theme)
│   ├── page.tsx                # Landing page (redirects to login/dashboard)
│   ├── login/
│   │   └── page.tsx            # Email/password login
│   └── (dashboard)/            # Route group - protected routes
│       ├── layout.tsx          # Dashboard layout (sidebar + header)
│       ├── orders/
│       │   └── page.tsx        # Live orders list
│       ├── menu/
│       │   └── page.tsx        # Menu editor
│       ├── settings/
│       │   └── page.tsx        # Restaurant settings
│       └── escalations/
│           ├── page.tsx        # Escalations list
│           └── [id]/page.tsx   # Escalation detail + reply
├── components/
│   ├── ui/                     # Reusable UI primitives (buttons, inputs, modals, toasts)
│   ├── orders/                 # Order-specific components (OrderCard, StatusBadge)
│   ├── menu/                   # Menu-specific components (ItemForm, CategorySelector, AvailabilityToggle)
│   ├── settings/               # Settings-specific components
│   └── escalations/            # Escalation-specific components (ThreadViewer, ReplyBox)
├── lib/
│   ├── api-client.ts           # Typed fetch wrapper with JWT handling and error interception
│   ├── auth.ts                 # Auth helpers (token storage/refresh, session management)
│   ├── ws.ts                   # WebSocket/polling client for live order updates
│   └── format.ts               # PKR currency, date/time formatters (Asia/Karachi timezone)
├── hooks/
│   ├── useOrders.ts            # Custom hook for order data + live updates/mutations
│   ├── useMenu.ts              # Custom hook for menu data (categories, items)
│   └── useEscalations.ts       # Custom hook for escalation data (list, detail, reply)
├── types/
│   └── api.ts                  # TypeScript types synced with backend API contract (Section 7A)
├── styles/
│   └── globals.css             # Global styles + Tailwind base + custom CSS variables
├── public/                     # Static assets (logo, icons, favicon)
├── .env.local.example          # NEXT_PUBLIC_API_BASE_URL, etc.
├── next.config.js
├── package.json
└── tsconfig.json
```

### Data Flow & State Management
1. **Authentication**:
   - User logs in via `/login` endpoint
   - JWT tokens stored in httpOnly cookies (via backend) or localStorage with refresh token rotation
   - API client automatically attaches Authorization header to requests

2. **Data Fetching**:
   - React Query hooks (`useOrders`, `useMenu`, `useEscalations`) fetch data from backend APIs
   - Automatic caching, background updates, and stale-while-revalidate strategy
   - Query invalidation on mutations for optimistic updates

3. **Real-time Updates**:
   - Primary: Attempt WebSocket connection to `/api/orders/live`
   - Fallback: Poll `GET /api/orders?status=pending` every 3-5 seconds
   - Order card updates in real-time without full refresh

4. **Mutations & Optimistic Updates**:
   - Creating/editing menu items: Optimistic update with rollback on failure
   - Updating order status: Immediate UI update, backend sync
   - Toggling item availability: Instant UI reflection

5. **Error Handling**:
   - Global error boundary for unexpected errors
   - Form-level validation errors displayed inline
   - API error responses transformed to user-friendly messages
   - Retry mechanisms for transient failures

### Key Components

#### Layout & Navigation
- **Root Layout**: Providers for React Query, Auth context, Theme
- **Dashboard Layout**: Persistent sidebar navigation with collapsible menu
- **Header**: Restaurant name/logo, user profile, notifications
- **Sidebar**: Navigation links to Orders, Menu, Settings, Escalations

#### Orders Page
- **OrderList**: Table/card view of active orders
- **OrderCard**: Individual order display with:
  - Customer info (phone, name if available)
  - Order items with quantities, variants, addons
  - Total amount
  - Current status badge
  - Action buttons (Confirm, Prepare, Out for Delivery, Deliver)
- **StatusBadge**: Color-coded status indicator (pending=yellow, confirmed=blue, etc.)
- **Live Update Indicator**: Visual cue when new orders arrive

#### Menu Page
- **MenuEditor**: Two-pane interface
  - Left: Category list + "Add Category" button
  - Right: Item list for selected category with "Add Item" button
- **ItemForm**: Modal/form for creating/editing items:
  - Name, description, base price
  - Category selector (dropdown)
  - Variants manager (name + price delta)
  - Addons manager (name + price)
  - Availability toggle
- **AvailabilityToggle**: Switch to instantly 86/un-86 items
- **Price formatting**: PKR currency with proper decimal handling

#### Settings Page
- **RestaurantForm**: Editable fields grouped logically:
  - Operating hours (opening/closing time)
  - Delivery settings (radius km, fee)
  - Financial settings (minimum order amount)
  - Brand voice (text area for AI agent tone instructions)
  - Timezone selector (default Asia/Karachi)
- **Validation**: Real-time validation with helpful error messages

#### Escalations Page
- **EscalationsList**: Table of escalations with:
  - Reason (truncated)
  - Status (open/acknowledged/resolved)
  - Created timestamp
  - Action buttons (View Detail, Resolve)
- **EscalationDetailView**: 
  - Full conversation chronology (messages with direction/role)
  - Escalation reason and metadata
  - Reply box with send button
  - Resolve escalation button
- **MessageThread**: Visual distinction between inbound/outbound, customer/agent/system messages

## API Contract Adherence
All frontend consumption strictly follows Section 7A of product-spec.md:
- All endpoints prefixed with `/api`
- Authorization: Bearer <JWT> header on all requests (except login)
- Restaurant-scoped data automatically enforced by backend
- Specific endpoints consumed:
  - POST `/api/auth/login`
  - POST `/api/auth/refresh`
  - GET `/api/orders` (with status filter and pagination)
  - GET `/api/orders/{id}`
  - PATCH `/api/orders/{id}/status`
  - GET `/api/menu` (categories + items)
  - POST `/api/menu/items`
  - PATCH `/api/menu/items/{id}`
  - PATCH `/api/menu/items/{id}/availability`
  - DELETE `/api/menu/items/{id}`
  - GET `/api/escalations`
  - GET `/api/escalations/{id}`
  - POST `/api/escalations/{id}/reply`
  - PATCH `/api/escalations/{id}/resolve`
  - GET `/api/settings`
  - PATCH `/api/settings`
  - GET `/api/conversations/{id}`
  - GET/WS `/api/orders/live` (with polling fallback)

## Multi-Tenancy Enforcement
- Frontend never handles `restaurant_id` directly - it's managed by backend via JWT
- All API requests automatically scoped to authenticated restaurant
- No cross-tenant data exposure possible
- Onboarding new restaurants requires zero frontend changes

## Responsive Design
- Mobile-first approach for accessibility on tablets/phones
- Sidebar collapses to icon-only menu on narrow screens
- Tables convert to card views on mobile
- Forms adapt to vertical stacking
- Touch-friendly controls and spacing

## Accessibility
- Semantic HTML elements
- Proper ARIA labels and roles
- Keyboard navigation support
- Sufficient color contrast (WCAG AA compliant)
- Focus management in modals and dialogs
- Screen reader friendly announcements for live updates

## Error Boundaries & Loading States
- Global error boundary catches unexpected errors
- Individual component boundaries for isolated failures
- Skeleton loaders during data fetching
- Empty states with helpful guidance
- Retry mechanisms for failed requests
- Toast notifications for transient success/error messages

## Performance Optimizations
- Code splitting via Next.js dynamic imports
- Image optimization with Next.js Image component
- React Query caching minimizes redundant requests
- Stale-while-revalidate for instant UI updates
- Bundle analysis and optimization
- Server Components where beneficial (minimal client-side JS)
- Efficient database querying patterns mirrored in frontend queries

## Security Considerations
- HTTP-only cookies for token storage (if implemented via backend)
- XSS prevention through proper escaping
- CSRF protection via SameSite cookies
- Rate limiting awareness in API client
- Input sanitization on form submission
- Secure headers (helmet-like via middleware if needed)
- Environment variable separation (.env.local never committed)

## Testing Strategy
- **Unit Tests**: Custom hooks, utilities, components (Jest + React Testing Library)
- **Integration Tests**: API client interactions, form submissions
- **E2E Tests**: Critical user journeys (Cypress or Playwright):
  - Login → View orders → Update status
  - Login → Edit menu item → Toggle availability
  - Login → View escalation → Send reply → Resolve
- **Visual Regression**: Storybook for component visual testing
- **Accessibility Testing**: axe-core integration

## Deployment & DevOps
- **Environment Variables**:
  - NEXT_PUBLIC_API_BASE_URL (configured per environment)
  - Other NEXT_PUBLIC_* variables as needed
- **Build Optimization**: Next.js production build
- **Deployment Targets**: Vercel, Netlify, or Docker
- **Monitoring**: Error tracking (Sentry), performance monitoring
- **CI/MS**: Automated linting, testing, building on PRs
- **Analytics**: Optional performance and usage analytics

## Future Enhancements
- WebSocket implementation in backend for true real-time updates
- Role-based access control (staff vs owner permissions)
- Dark/light theme toggle
- Multi-language support (Urdu/English)
- Export/Order history reporting
- Integration with printer/kitchen display systems
- Offline capability with sync when reconnected

---
*This design adheres to all project rules including multi-tenancy (Rule 1), tech stack compliance (Rule 2), and API contract adherence (Rule 3).*