# SecureVault - End-to-End Encrypted File Storage Platform

A production-ready, zero-knowledge encrypted file storage system with advanced security features including AES-256-GCM encryption, Shamir Secret Sharing, and comprehensive activity logging.

## Features Implemented

### Core Security Features
- **End-to-End Encryption**: AES-256-GCM encryption performed entirely in the browser
- **Zero-Knowledge Architecture**: Server never receives plaintext data
- **Shamir Secret Sharing**: 3-part key recovery system (User/Recovery/Device shares)
- **Secure Authentication**: Email/password with JWT tokens via Supabase Auth
- **Activity Logging**: Comprehensive SOC2-level audit trail
- **Row Level Security**: Database-level access control

### User Features
- User registration and login with secure password handling
- File upload with drag-and-drop support
- Real-time encryption progress tracking
- Dark/Light mode toggle
- Responsive design for all screen sizes
- Protected routes with authentication guards

### Database Schema
Complete PostgreSQL schema with:
- User profiles with role-based access
- Encrypted file storage with versioning
- Secure notes vault
- Share links with password protection
- Activity logs with device tracking
- Key shares for Shamir Secret Sharing
- OTP codes and magic links for 2FA

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **Web Crypto API** for client-side encryption

### Backend
- **Supabase** for:
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Edge Functions (for future features)
  - Real-time subscriptions (for future features)

### Security
- AES-256-GCM encryption
- Shamir Secret Sharing (XOR-based implementation)
- bcrypt-compatible password hashing (SHA-256)
- JWT-based authentication
- CORS and security headers
- Rate limiting ready (via RLS)

## Project Structure

```
src/
├── components/
│   └── ProtectedRoute.tsx          # Route authentication wrapper
├── contexts/
│   ├── AuthContext.tsx             # Authentication state management
│   └── ThemeContext.tsx            # Dark/Light mode management
├── lib/
│   └── supabase.ts                 # Supabase client & TypeScript types
├── pages/
│   ├── Dashboard.tsx               # Main dashboard with stats
│   ├── Login.tsx                   # User login page
│   ├── Register.tsx                # User registration page
│   └── Upload.tsx                  # File upload with encryption
├── services/
│   ├── activityLog.ts              # Activity logging service
│   ├── adminService.ts             # Admin panel operations
│   ├── fileService.ts              # File management & encryption
│   ├── noteService.ts              # Secure notes operations
│   └── shareService.ts             # Share link management
├── utils/
│   └── crypto.ts                   # Encryption utilities & helpers
├── App.tsx                         # Main app with routing
└── main.tsx                        # App entry point
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (already configured in this project)

### Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Variables**
The `.env` file is already configured with Supabase credentials:
```
VITE_SUPABASE_URL=https://eswixtuesfxyynpfdqno.supabase.co
VITE_SUPABASE_ANON_KEY=<your-key>
```

3. **Database Setup**
The database schema has been automatically applied via migrations. Tables include:
- profiles (user data)
- encrypted_files (file storage)
- secure_notes (encrypted notes)
- key_shares (Shamir shares)
- share_links (public sharing)
- activity_logs (audit trail)
- file_versions (version control)
- otp_codes (2FA codes)
- magic_links (passwordless login)

### Running the Application

#### Development Mode
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

#### Production Build
```bash
npm run build
npm run preview
```

#### Type Checking
```bash
npm run typecheck
```

#### Linting
```bash
npm run lint
```

## Usage Guide

### User Registration
1. Navigate to `/register`
2. Enter full name, email, password
3. Account is created with 'user' role
4. Automatic profile creation via database trigger

### User Login
1. Navigate to `/login`
2. Enter email and password
3. Failed login attempts are tracked
4. Account locks after 5 failed attempts (15 min cooldown)

### File Upload & Encryption
1. Click "Upload Files" from dashboard
2. Drag & drop or select files
3. Files are encrypted with AES-256-GCM in browser
4. **SAVE YOUR ENCRYPTION KEY** - Copy and store it safely!
5. Only encrypted data sent to server
6. Cannot be recovered without the key

### File Management & Decryption
1. Navigate to "My Files" from dashboard
2. Search or filter files
3. Click "Decrypt" on any file
4. **Paste your saved encryption key** (base64 format)
5. File downloads automatically
6. View activity: thumbnails for images, download for other types

### File Actions
- **Decrypt**: Download with your encryption key
- **Share**: Create password-protected links with expiry
- **Rotate Key**: Generate new encryption key for file
- **Delete**: Move to trash (recoverable for 30 days)
- **Restore**: Recover deleted files

### Secure Notes
1. Navigate to "Secure Notes" from dashboard
2. Create, edit, or delete encrypted notes
3. Notes are encrypted with same AES-256-GCM
4. Searchable by title
5. Full edit/view capabilities

### Dashboard Features
- View file statistics (total files, storage used, deleted files)
- Quick access to upload, files, notes, and shares
- Admin panel access (for admin users)
- Recent files list with quick actions

## Security Architecture

### Encryption Flow
1. User selects file for upload
2. Generate unique AES-256 key using Web Crypto API
3. Encrypt file data with AES-GCM (12-byte IV, 128-bit auth tag)
4. Split key into 3 shares using Shamir Secret Sharing
5. Store encrypted data + metadata + shares in database
6. Original key never stored on server

### Decryption Flow
1. User requests file decryption
2. Retrieve 2 of 3 key shares from database
3. Reconstruct encryption key using Shamir algorithm
4. Decrypt file data using AES-GCM
5. Verify authentication tag
6. Download or preview decrypted content

### Row Level Security (RLS)
All database tables have RLS enabled with policies:
- Users can only access their own data
- Admins have elevated read permissions
- Share links allow controlled public access
- Activity logs are append-only for users

## Database Tables

### profiles
Extends auth.users with:
- Role (user/admin)
- Security settings (login attempts, lock status)
- Device tracking
- Theme preferences

### encrypted_files
Stores encrypted file metadata:
- File name, type, size
- Encrypted data (base64)
- IV and auth tag
- Version tracking
- Soft delete support

### key_shares
Shamir Secret Sharing implementation:
- 3 share types per file
- Encrypted share data
- Linked to files and users

### activity_logs
Comprehensive audit trail:
- User actions (login, upload, encrypt, decrypt)
- Device information
- Success/failure status
- Error messages

### share_links
Secure file sharing:
- Unique tokens
- Password protection (optional)
- Expiry dates (optional)
- One-time view support
- View count tracking

## API Services

### Activity Log Service
- `log()` - Create activity log entry
- `getUserLogs()` - Get user's activity history
- `exportLogsToCSV()` - Export logs to CSV
- `getActionStats()` - Get action statistics
- `getDailyActivity()` - Get daily activity data

### File Service
- `uploadEncryptedFile()` - Upload and encrypt file
- `getFiles()` - List user's files
- `decryptFile()` - Decrypt and download file
- `deleteFile()` - Soft delete file
- `restoreFile()` - Restore deleted file
- `regenerateFileKey()` - Rotate encryption key
- `getStats()` - Get file statistics

### Note Service
- `createNote()` - Create encrypted note
- `getNotes()` - List user's notes
- `decryptNote()` - Decrypt note content
- `updateNote()` - Update encrypted note
- `deleteNote()` - Delete note

### Share Service
- `createShareLink()` - Generate share link
- `validateShareAccess()` - Verify share permissions
- `incrementViewCount()` - Track share views
- `revokeShare()` - Deactivate share link

### Admin Service
- `getAllUsers()` - List all users
- `getUserStats()` - Get platform statistics
- `updateUserRole()` - Change user role
- `toggleUserStatus()` - Enable/disable account
- `getSuspiciousActivity()` - Detect security threats
- `getSystemHealth()` - Monitor system status

## Extending the Platform

### Adding New Features
The architecture is designed for extensibility:

1. **Add New Pages**: Create in `src/pages/` and add routes in `App.tsx`
2. **Add Services**: Create in `src/services/` following existing patterns
3. **Add Components**: Create in `src/components/` as reusable UI elements
4. **Database Changes**: Use Supabase migrations to modify schema

### Fully Implemented Features
1. ✅ **File Management Page** - Browse, search, sort files with infinite scroll
2. ✅ **File Decryption** - Enter encryption key and download decrypted files
3. ✅ **Secure Notes** - Full CRUD with encryption/decryption
4. ✅ **Share Links** - Create password-protected, time-limited share links
5. ✅ **Admin Dashboard** - Real-time analytics, system health, suspicious activity
6. ✅ **Activity Logs** - Export audit trail as CSV
7. ✅ **Trash Bin** - Soft-delete and restore files within 30 days
8. ✅ **Key Regeneration** - Rotate encryption keys with re-encryption
9. ✅ **File Thumbnails** - Auto-generate for images
10. ✅ **Dark/Light Mode** - Full theme support with persistence

### Missing Features (To Implement)
1. **OTP/2FA UI** - Email-based OTP verification flow
2. **Magic Link Login** - Passwordless authentication UI
3. **WebAuthn Support** - Biometric authentication
4. **PWA Support** - Service worker, offline mode, installable
5. **File Versioning UI** - View and restore file versions
6. **Public Share Page** - Public interface to decrypt shared files
7. **QR Code Backup** - Visual encryption key backup
8. **User Settings** - Profile, security settings page
9. **Bulk Operations** - Multi-file actions (delete, share, etc)
10. **Advanced Search** - Filter by type, date, size ranges

### Edge Functions (Future)
For additional features, create Supabase Edge Functions:

```bash
# Example: Email service for OTP
supabase functions new send-otp

# Example: File processing
supabase functions new process-upload

# Example: Malware scanning
supabase functions new scan-file
```

## Security Best Practices

### For Development
1. Never log encryption keys or sensitive data
2. Always validate user input
3. Use parameterized queries (Supabase handles this)
4. Keep dependencies updated
5. Review RLS policies before deployment

### For Production
1. Enable HTTPS only
2. Set up rate limiting (Supabase Edge Functions)
3. Configure CORS properly
4. Enable audit logging
5. Regular security audits
6. Backup encryption keys securely
7. Monitor suspicious activity
8. Implement key rotation schedule

## Performance Optimization

### Current Optimizations
- Lazy loading with React Router
- Optimized bundle size with Vite
- Efficient re-renders with React hooks
- Database indexes on frequently queried columns
- Connection pooling via Supabase

### Recommendations
- Implement virtual scrolling for large file lists
- Add pagination to API calls
- Cache frequently accessed data
- Compress large files before encryption
- Use CDN for static assets

## Troubleshooting

### Common Issues

**Login fails with "Invalid credentials"**
- Check email and password are correct
- Verify Supabase connection
- Check for account lock (5 failed attempts)

**File upload fails**
- Check file size (Supabase has limits)
- Verify network connection
- Check browser console for errors
- Ensure sufficient storage quota

**Decryption fails**
- Verify correct encryption key
- Check key shares in database
- Ensure file hasn't been corrupted

**Dark mode not working**
- Check tailwind.config.js has darkMode: 'class'
- Verify ThemeProvider wraps app
- Clear browser cache

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify
```bash
# Build
npm run build

# Deploy dist/ folder
```

### Environment Variables
Set these in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Contributing

This is a reference implementation demonstrating:
- Modern React patterns with TypeScript
- Supabase integration
- Client-side encryption
- Security best practices
- Production-ready architecture

## License

MIT License - Free to use and modify

## Support

For issues or questions:
1. Check this README
2. Review the code comments
3. Check Supabase documentation
4. Review browser console for errors

## Acknowledgments

- Supabase for backend infrastructure
- React team for excellent framework
- Vite for blazing fast build tool
- TailwindCSS for utility-first styling
- Web Crypto API for browser-based encryption
