# Quick Deployment Guide

## ✅ Current Status

Your repository is already connected to GitHub:
- **Remote**: `https://github.com/haneelteja/aamodha-elma-sync.git`
- **Branch**: `main`

## 🚀 Step 1: Push to GitHub

Run this command to push all changes:

```bash
git push origin main
```

If you get authentication errors:
- Use a Personal Access Token instead of password
- Or set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

## 🚀 Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** with your GitHub account
3. **Import Project**:
   - Click "Add New" → "Project"
   - Find "aamodha-elma-sync" repository
   - Click "Import"
4. **Configure**:
   - Framework: Vite (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Add Environment Variables**:
   - Go to Settings → Environment Variables
   - Add:
     ```
     VITE_SUPABASE_URL = your_supabase_url
     VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
     ```
6. **Deploy**: Click "Deploy"
7. **Wait**: Build takes 2-3 minutes
8. **Done**: You'll get a URL like `https://aamodha-elma-sync.vercel.app`

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No (first time)
# - Project name? aamodha-elma-sync
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

## 🌐 Step 3: Add Custom Domain (Optional)

1. **In Vercel Dashboard**:
   - Go to your project
   - Settings → Domains
   - Click "Add Domain"
2. **Enter Domain**: e.g., `app.aamodhaelma.com`
3. **Configure DNS**:
   - Add CNAME record: `app` → `cname.vercel-dns.com`
   - Or follow Vercel's specific DNS instructions
4. **Wait**: DNS propagation (up to 24 hours)
5. **SSL**: Automatically provisioned by Vercel

## 📋 Environment Variables Checklist

Make sure these are set in Vercel:

- [ ] `VITE_SUPABASE_URL` - Your Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- [ ] (Optional) `VITE_REDIS_HOST` - If using Redis backend
- [ ] (Optional) `VITE_REDIS_PORT` - If using Redis backend

## 🔍 Verify Deployment

After deployment:

1. **Visit your Vercel URL**
2. **Test the application**:
   - Login works
   - Data loads correctly
   - All features functional
3. **Check build logs** in Vercel dashboard if issues

## 🔄 Automatic Deployments

Vercel automatically deploys:
- **Push to `main`** → Production deployment
- **Push to other branches** → Preview deployment

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel
- Verify all dependencies in `package.json`
- Ensure environment variables are set

### 404 on Routes
- Verify `vercel.json` has correct rewrite rules
- Check that SPA routing is configured

### CORS Errors
- Add Vercel domain to Supabase allowed origins
- Check Supabase CORS settings

## 📚 Full Documentation

For detailed instructions, see:
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `README.md` - Project documentation

## ✅ Quick Commands

```bash
# Push to GitHub
git push origin main

# Check deployment status (if using CLI)
vercel ls

# View deployment logs
vercel logs

# Open deployment in browser
vercel open
```

---

**Ready to deploy?** Run `git push origin main` then follow Step 2 above! 🚀

