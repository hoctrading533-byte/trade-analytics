# LuminaFox SaaS Trading Journal Structure

This document defines the target project structure before feature coding.

## Current Project Snapshot

- Frontend exists: Vue 3, Vite, Pinia, Vue Router.
- Current backend exists: Node/Express in `server/index.js`.
- Current database layer exists for PostgreSQL-style SQL in Node backend.
- Existing modules include dashboard, trading journal, Prop Guardian, pricing, admin panel, MT5 connector mocks.
- Missing from target stack:
  - TailwindCSS
  - ApexCharts / Vue ApexCharts
  - ASP.NET Core Web API project
  - SQL Server + EF Core migrations
  - .NET Google OAuth/JWT auth pipeline
  - .NET PayOS service/webhook pipeline

## Target Monorepo Layout

```text
luminafox/
  apps/
    web/                         # Vue 3 + Vite SaaS frontend
      src/
        app/
          App.vue
          main.ts
          router/
            index.ts
            guards/
              auth.guard.ts
              subscription.guard.ts
              admin.guard.ts
          stores/
            auth.store.ts
            subscription.store.ts
            theme.store.ts
            trading.store.ts
            admin.store.ts
          providers/
            api.provider.ts
            auth.provider.ts
            theme.provider.ts
        assets/
          styles/
            tailwind.css
            theme.css
            components.css
        components/
          layout/
            AppShell.vue
            Sidebar.vue
            Header.vue
            ThemeToggle.vue
            LanguageToggle.vue
          ui/
            BaseButton.vue
            BaseCard.vue
            BaseModal.vue
            BaseInput.vue
            BaseTable.vue
            StatCard.vue
            EmptyState.vue
            LoadingState.vue
          charts/
            ApexLineChart.vue
            ApexDonutChart.vue
            ApexBarChart.vue
            HeatmapChart.vue
        modules/
          auth/
            pages/
              LoginPage.vue
              AuthCallbackPage.vue
            services/
              auth.api.ts
          billing/
            pages/
              PricingPage.vue
              PaymentResultPage.vue
            components/
              PlanCard.vue
              PayOsQrCard.vue
              SubscriptionBadge.vue
            services/
              billing.api.ts
          dashboard/
            pages/
              UserDashboardPage.vue
            components/
              AnalyticsCards.vue
              RecentTradesTable.vue
              TradeHeatmap.vue
              EquityCurvePanel.vue
          journal/
            pages/
              JournalPage.vue
              TradeDetailPage.vue
            components/
              TradeForm.vue
              TradeTable.vue
              TradeFilters.vue
            services/
              trades.api.ts
          analytics/
            pages/
              AnalyticsPage.vue
            components/
              PerformanceOverview.vue
              ReportGrid.vue
              RiskMetrics.vue
          playbook/
            pages/
              PlaybookPage.vue
            components/
              PlaybookCard.vue
              PlaybookForm.vue
          replay/
            pages/
              ReplayPage.vue
            components/
              ReplayTimeline.vue
              ReplayChart.vue
          admin/
            pages/
              AdminDashboardPage.vue
              UserManagementPage.vue
              RevenueDashboardPage.vue
              SubscriptionManagementPage.vue
              PaymentHistoryPage.vue
            components/
              AdminStats.vue
              UserTable.vue
              RevenueChart.vue
              SubscriptionTable.vue
        types/
          auth.types.ts
          billing.types.ts
          trading.types.ts
          admin.types.ts
        utils/
          money.ts
          date.ts
          permissions.ts
      package.json
      tailwind.config.ts
      postcss.config.js
      vite.config.ts

    api/                         # ASP.NET Core Web API (.NET 8)
      LuminaFox.Api/
        Controllers/
          AuthController.cs
          BillingController.cs
          PayOsWebhookController.cs
          TradesController.cs
          AnalyticsController.cs
          AdminUsersController.cs
          AdminRevenueController.cs
          AdminSubscriptionsController.cs
        Middleware/
          ErrorHandlingMiddleware.cs
          SubscriptionGateMiddleware.cs
        Extensions/
          AuthenticationExtensions.cs
          AuthorizationExtensions.cs
          ServiceCollectionExtensions.cs
          SwaggerExtensions.cs
        Program.cs
        appsettings.json
        appsettings.Development.json

      LuminaFox.Application/
        Abstractions/
          ICurrentUserService.cs
          IJwtTokenService.cs
          IPayOsService.cs
          IDateTimeProvider.cs
        Auth/
          Commands/
            GoogleLoginCommand.cs
          Dtos/
            AuthResponseDto.cs
            UserProfileDto.cs
        Billing/
          Commands/
            CreatePaymentCommand.cs
            HandlePayOsWebhookCommand.cs
          Queries/
            GetCurrentSubscriptionQuery.cs
            GetPlansQuery.cs
          Dtos/
            PlanDto.cs
            SubscriptionDto.cs
            PaymentDto.cs
        Trading/
          Commands/
            CreateTradeCommand.cs
            UpdateTradeCommand.cs
            DeleteTradeCommand.cs
          Queries/
            GetTradesQuery.cs
            GetDashboardAnalyticsQuery.cs
          Dtos/
            TradeDto.cs
            TradeAnalyticsDto.cs
        Admin/
          Queries/
            GetUsersQuery.cs
            GetRevenueDashboardQuery.cs
            GetPaymentHistoryQuery.cs
          Commands/
            BanUserCommand.cs
            ActivateSubscriptionCommand.cs
        Common/
          Result.cs
          PagedResult.cs

      LuminaFox.Domain/
        Entities/
          User.cs
          Role.cs
          Plan.cs
          Subscription.cs
          Payment.cs
          RevenueLog.cs
          Trade.cs
          TradeAnalytics.cs
        Enums/
          UserRole.cs
          UserStatus.cs
          SubscriptionStatus.cs
          PaymentStatus.cs
          TradeSide.cs
          AssetType.cs
        ValueObjects/
          Money.cs
          DateRange.cs
        Services/
          TradingMetricsCalculator.cs

      LuminaFox.Infrastructure/
        Persistence/
          LuminaFoxDbContext.cs
          Configurations/
            UserConfiguration.cs
            RoleConfiguration.cs
            PlanConfiguration.cs
            SubscriptionConfiguration.cs
            PaymentConfiguration.cs
            RevenueLogConfiguration.cs
            TradeConfiguration.cs
            TradeAnalyticsConfiguration.cs
          Migrations/
          Seed/
            RoleSeeder.cs
            PlanSeeder.cs
            AdminSeeder.cs
        Auth/
          JwtTokenService.cs
          GoogleAuthService.cs
        Billing/
          PayOsService.cs
          PayOsSignatureValidator.cs
        Security/
          CurrentUserService.cs
          PasswordlessUserResolver.cs

      LuminaFox.Contracts/
        Auth/
          GoogleLoginRequest.cs
          AuthResponse.cs
        Billing/
          CreatePaymentRequest.cs
          PayOsWebhookRequest.cs
        Trading/
          CreateTradeRequest.cs
          TradeFilterRequest.cs
        Admin/
          BanUserRequest.cs
          UpdateSubscriptionRequest.cs

      LuminaFox.Tests/
        Billing/
          PayOsSignatureTests.cs
          SubscriptionExpiryTests.cs
        Trading/
          TradingMetricsCalculatorTests.cs
        Security/
          RolePolicyTests.cs

      LuminaFox.sln

  docs/
    saas-trading-journal-structure.md
    api.md
    database.md
    environment.md
    deployment.md
```

## Database Tables

### Users

- Id uniqueidentifier primary key
- GoogleId nvarchar(160), nullable
- Email nvarchar(256), unique
- FullName nvarchar(160)
- AvatarUrl nvarchar(512), nullable
- RoleId uniqueidentifier
- Status nvarchar(40)
- CreatedAt datetimeoffset
- UpdatedAt datetimeoffset
- LastLoginAt datetimeoffset, nullable

### Roles

- Id uniqueidentifier primary key
- Name nvarchar(80), unique
- CreatedAt datetimeoffset

Seed:

- Admin
- User

### Plans

- Id uniqueidentifier primary key
- Code nvarchar(80), unique
- Name nvarchar(160)
- PriceVnd int
- DurationDays int
- IsActive bit
- CreatedAt datetimeoffset

Seed:

- Premium, 1000 VND, 30 days

### Subscriptions

- Id uniqueidentifier primary key
- UserId uniqueidentifier
- PlanId uniqueidentifier
- Status nvarchar(40)
- StartAt datetimeoffset
- EndAt datetimeoffset
- CancelledAt datetimeoffset, nullable
- CreatedAt datetimeoffset
- UpdatedAt datetimeoffset

Rules:

- Admin skips subscription gate.
- User requires active subscription.
- Expired subscription blocks dashboard.

### Payments

- Id uniqueidentifier primary key
- UserId uniqueidentifier
- PlanId uniqueidentifier
- SubscriptionId uniqueidentifier, nullable
- AmountVnd int
- Provider nvarchar(80)
- ProviderOrderCode nvarchar(120)
- PaymentLinkId nvarchar(160), nullable
- CheckoutUrl nvarchar(512), nullable
- QrCode nvarchar(max), nullable
- Status nvarchar(40)
- PayOsRawJson nvarchar(max)
- PaidAt datetimeoffset, nullable
- CreatedAt datetimeoffset
- UpdatedAt datetimeoffset

### RevenueLogs

- Id uniqueidentifier primary key
- PaymentId uniqueidentifier
- UserId uniqueidentifier
- AmountVnd int
- RevenueDate date
- MonthKey nvarchar(7)
- CreatedAt datetimeoffset

### Trades

- Id uniqueidentifier primary key
- UserId uniqueidentifier
- AccountName nvarchar(160), nullable
- Symbol nvarchar(40)
- AssetType nvarchar(40)
- Side nvarchar(20)
- EntryPrice decimal(18, 8)
- ExitPrice decimal(18, 8)
- StopLoss decimal(18, 8), nullable
- TakeProfit decimal(18, 8), nullable
- Quantity decimal(18, 8)
- Commission decimal(18, 2)
- Fees decimal(18, 2)
- NetPnl decimal(18, 2)
- RMultiple decimal(18, 4)
- StrategyTag nvarchar(120), nullable
- EmotionTag nvarchar(120), nullable
- Notes nvarchar(max), nullable
- EntryAt datetimeoffset
- ExitAt datetimeoffset, nullable
- CreatedAt datetimeoffset
- UpdatedAt datetimeoffset

### TradeAnalytics

- Id uniqueidentifier primary key
- UserId uniqueidentifier
- PeriodStart date
- PeriodEnd date
- TotalTrades int
- WinRate decimal(8, 4)
- ProfitFactor decimal(18, 4)
- Expectancy decimal(18, 4)
- TotalPnl decimal(18, 2)
- MaxDrawdown decimal(18, 2)
- JsonSnapshot nvarchar(max)
- CreatedAt datetimeoffset

## API Routes

### Auth

- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

### Billing

- `GET /api/billing/plans`
- `GET /api/billing/me`
- `POST /api/billing/payos/create`
- `POST /api/billing/payos/webhook`

### User Trading

- `GET /api/trades`
- `POST /api/trades`
- `GET /api/trades/{id}`
- `PUT /api/trades/{id}`
- `DELETE /api/trades/{id}`
- `GET /api/analytics/dashboard`
- `GET /api/analytics/reports`

### Admin

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `PATCH /api/admin/users/{id}/ban`
- `GET /api/admin/revenue`
- `GET /api/admin/subscriptions`
- `PATCH /api/admin/subscriptions/{id}`
- `GET /api/admin/payments`

## Auth and Routing Rules

Frontend route guards:

1. Not logged in -> `/login`.
2. Email `tamdvtd@fpt.edu.vn` -> role Admin -> `/admin/dashboard`.
3. Admin skips payment.
4. User without active subscription -> `/pricing`.
5. User with active subscription -> `/dashboard`.
6. Expired subscription -> `/pricing`.

Backend policies:

- `RequireAuthenticatedUser`
- `RequireAdminRole`
- `RequireActiveSubscription`

## PayOS Flow

1. User clicks Buy Premium.
2. Frontend calls `POST /api/billing/payos/create`.
3. API creates Payment row with Pending status.
4. API calls PayOS create payment link.
5. API returns QR/checkout URL.
6. PayOS calls webhook.
7. API validates checksum/signature.
8. API updates Payment to Paid.
9. API creates Subscription for 30 days.
10. API writes RevenueLog.
11. User can enter dashboard.

## UI Pages

### Public/Auth

- `/login`
- `/auth/callback`
- `/pricing`
- `/payment/result`

### User

- `/dashboard`
- `/journal`
- `/analytics`
- `/reports`
- `/playbook`
- `/backtesting`
- `/replay`
- `/accounts`
- `/settings`

### Admin

- `/admin/dashboard`
- `/admin/users`
- `/admin/revenue`
- `/admin/subscriptions`
- `/admin/payments`
- `/admin/settings`

## Visual System

Dark mode:

- App background: `#07070A`
- Card: `#141018`
- Border: `#2A142A`
- Primary: `#FF2D9A`
- Hot pink: `#FF4DA6`
- Text: `#FFFFFF`
- Muted text: `#B8A8B8`
- Success: `#00D084`
- Danger: `#FF3B7A`

Light mode:

- App background: `#FFF7FB`
- Card: `#FFFFFF`
- Border: `#F2D6E6`
- Primary: `#FF3B9D`
- Text: `#17121A`
- Muted text: `#6F6472`
- Success: `#00A86B`
- Danger: `#FF3366`

## Implementation Phases

### Phase 0 - Project Structure

- Create frontend module architecture.
- Create ASP.NET Core clean architecture solution.
- Add docs for API, DB, environment.
- Add Tailwind/ApexCharts dependency plan.

### Phase 1 - Backend Foundation

- ASP.NET Core API.
- SQL Server DbContext.
- EF Core entity configurations.
- Migrations.
- Seed roles, premium plan, admin mapping.
- JWT authentication.

### Phase 2 - Google Auth and Subscription Gate

- Google OAuth token validation.
- User upsert.
- Admin email role assignment.
- Active subscription middleware.
- Frontend route guards.

### Phase 3 - PayOS

- Create payment endpoint.
- Webhook validation.
- Auto subscription activation.
- Expiry enforcement.
- Revenue logs.

### Phase 4 - User SaaS Dashboard

- TradeZella-style layout.
- Analytics cards.
- ApexCharts dashboard.
- Recent trades.
- Journal CRUD.

### Phase 5 - Admin Dashboard

- User management.
- Subscription management.
- Revenue dashboard.
- Payment history.
- Ban user.

### Phase 6 - Production Hardening

- API docs.
- Error handling.
- Tests.
- Logging.
- Deployment guide.

## Dependency Approval Needed Before Coding

Frontend:

- `tailwindcss`
- `@tailwindcss/vite` or `postcss` + `autoprefixer`
- `apexcharts`
- `vue3-apexcharts`

Backend:

- `Microsoft.EntityFrameworkCore.SqlServer`
- `Microsoft.EntityFrameworkCore.Design`
- `Microsoft.AspNetCore.Authentication.JwtBearer`
- `Google.Apis.Auth`
- Optional OpenAPI package if not included by template

No dependency install should happen until approved.
