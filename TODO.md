# Performance Optimization Progress

## Phase 1: Install npm packages
- [x] Install @tanstack/react-query for client-side caching
- [x] Install lru-cache for server-side caching

## Phase 2: Server-side optimizations
- [ ] Create server-side cache utility
- [ ] Optimize dashboard API - single MongoDB aggregation pipeline (reduces 11+ queries to 1)
- [ ] Add MongoDB indexes for common queries
- [ ] Add server-side caching with lru-cache

## Phase 3: Client-side optimizations
- [x] Create shared SVG icon component (Icons.tsx)
- [ ] Add React.memo/useMemo for expensive list renders
- [ ] Parallelize API calls in layout/page components
- [ ] Lazy load SendEmailModal with dynamic import
- [ ] Remove window.location.reload() on company switch
- [ ] Add React Query provider and useQuery hooks

## Phase 4: Image & bundle optimizations
- [ ] Use Next.js Image with Cloudinary transformations
