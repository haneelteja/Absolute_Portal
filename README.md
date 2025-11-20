# Aamodha Elma Sync Application

A comprehensive operations portal for managing sales, orders, receivables, factory payables, and more.

## 🚀 Features

- **Sales Management**: Track sales transactions and payments
- **Order Management**: Manage customer orders and delivery schedules
- **Receivables Tracking**: Monitor outstanding customer payments
- **Factory Payables**: Track factory production and payments
- **Label Management**: Manage label purchases and payments
- **Transport Expenses**: Track transportation costs
- **Reports & Analytics**: Comprehensive reporting and dashboard
- **User Management**: Role-based access control

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: TanStack React Query
- **Backend**: Supabase (PostgreSQL)
- **Caching**: Browser-based cache with React Query
- **Deployment**: Vercel

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🗄️ Database Setup

1. Run database migrations from `sql/migrations/`:
   - Apply scripts in chronological order
   - Use `complete_database_setup_safe.sql` for initial setup

2. Apply performance optimizations from `sql/performance/`:
   - `DATABASE_INDEXES_OPTIMIZATION.sql` - Add indexes
   - `FIX_N_PLUS_ONE_TRANSPORT_EXPENSES.sql` - Fix query performance

3. See `docs/database/MIGRATION_GUIDE.md` for detailed instructions

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

See `docs/deployment/DEPLOYMENT_GUIDE.md` for detailed instructions.

## 📚 Documentation

### Setup Guides
- `docs/setup/AUTHENTICATION_SETUP.md` - Authentication configuration
- `docs/setup/EMAIL_SETUP_GUIDE.md` - Email service setup
- `docs/setup/ENVIRONMENT_VARIABLES.md` - Environment configuration
- `docs/setup/REDIS_SETUP_GUIDE.md` - Redis caching setup

### Performance & Optimization
- `docs/performance/PERFORMANCE_ARCHITECTURE_ANALYSIS.md` - Comprehensive performance guide
- `docs/performance/PERFORMANCE_IMPROVEMENT_PLAN.md` - Performance optimization plan

### Database
- `docs/database/MIGRATION_GUIDE.md` - Database migration instructions

### Deployment
- `docs/deployment/DEPLOYMENT_GUIDE.md` - Deployment procedures

### Maintenance
- `docs/MAINTENANCE.md` - Codebase maintenance guide
- `docs/CODEBASE_CLEANUP_REPORT.md` - Cleanup history and procedures
- `docs/COMPREHENSIVE_CODEBASE_REVIEW_SUMMARY.md` - Code quality review

## 🏗️ Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # External service integrations
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components
│   └── types/          # TypeScript type definitions
├── sql/
│   ├── migrations/     # Database migrations
│   ├── fixes/          # One-time fixes
│   ├── utilities/       # Utility scripts
│   └── performance/     # Performance optimizations
├── docs/
│   ├── performance/     # Performance documentation
│   ├── deployment/      # Deployment guides
│   ├── setup/          # Setup guides
│   └── database/       # Database documentation
└── supabase/
    └── migrations/      # Supabase migration files
```

## 🔍 Code Quality

- **ESLint**: Configured for React and TypeScript
- **TypeScript**: Strict mode enabled
- **Code Organization**: Structured directories for maintainability
- **Performance**: Optimized queries and React components

## 📊 Performance

- **Initial Load**: < 2s target
- **Database Queries**: Optimized with indexes
- **Bundle Size**: Code splitting implemented
- **Caching**: React Query with optimized cache strategies

See `docs/performance/PERFORMANCE_ARCHITECTURE_ANALYSIS.md` for details.

## 🧹 Maintenance

Regular maintenance procedures:
- Quarterly code cleanup reviews
- Performance monitoring
- Dependency updates
- Documentation consolidation

See `docs/MAINTENANCE.md` for maintenance procedures.

## 📝 License

Private - Aamodha Enterprises

## 🤝 Contributing

Internal use only. For questions or issues, refer to documentation in `docs/` directory.

---

**Last Updated:** January 2025  
**Version:** 1.0.0
