# SecureVault - Quick Start Guide

## Overview
SecureVault is a zero-knowledge encrypted file storage platform. All files are encrypted in your browser before being sent to the server - the server never receives unencrypted data.

## Key Concept: Encryption Keys
- When you upload a file, a unique encryption key is generated
- This key is displayed after upload - **YOU MUST SAVE IT**
- Without the key, your files cannot be decrypted
- Keys are saved in base64 format (long text strings)

## Getting Started (5 minutes)

### Step 1: Create Account
1. Go to registration page (`/register`)
2. Enter your name, email, and password
3. Click "Sign Up"
4. Check your email (optional confirmation)

### Step 2: Login
1. Navigate to login page (`/login`)
2. Enter your email and password
3. Click "Sign In"
4. You'll see the dashboard

### Step 3: Upload Your First File
1. Click **"Upload Files"** from dashboard
2. Drag & drop a file or click **"Select Files"**
3. Click **"Encrypt and Upload"** button
4. Wait for encryption to complete (progress bar shows)

### Step 4: SAVE YOUR ENCRYPTION KEY
⚠️ **CRITICAL**: After upload, you'll see your encryption key
1. A textarea will show your encryption key
2. Click **"Copy Key"** to copy to clipboard
3. **SAVE IT SOMEWHERE SAFE**:
   - Paste in a text file
   - Save in a password manager
   - Print it
4. Without this key, you cannot decrypt the file!

### Step 5: View Your Files
1. Click **"My Files"** from dashboard (or upload again)
2. You'll see all your encrypted files
3. Search by filename using the search box

### Step 6: Decrypt and Download a File
1. Find your file in "My Files"
2. Click **"Decrypt"** button
3. A modal will appear asking for your encryption key
4. Paste your saved encryption key (the long base64 text)
5. Click **"Download"**
6. File downloads automatically

## Complete Workflow

```
Upload File → Get Encryption Key → SAVE KEY
     ↓
My Files Page → Find File → Click Decrypt
     ↓
Paste Encryption Key → Download File
```

## Features You Can Use Now

### File Management
- Upload files with drag & drop
- Search files by name
- Filter deleted files
- View file sizes and dates
- See file thumbnails (for images)

### File Actions
- **Decrypt**: Enter key and download
- **Share**: Create password-protected share links
- **Rotate Key**: Generate new encryption key
- **Delete**: Move to trash (recoverable 30 days)
- **Restore**: Recover deleted files

### Secure Notes
- Click **"Secure Notes"** from dashboard
- Create encrypted notes
- Each note is independently encrypted
- Search notes by title
- Edit and delete notes

### Admin Panel (If You're Admin)
- Click **"Admin Panel"** from dashboard
- See user statistics
- View activity logs
- Export logs as CSV
- Monitor system health

## Important Tips

### For Encryption Keys
- **Format**: Base64 text string (includes letters, numbers, +, /, =)
- **Length**: Very long (usually 300-500 characters)
- **Storage**: Save in password manager or secure location
- **Sharing**: Never share your keys with others
- **Recovery**: Keys are NOT recoverable if lost

### For File Sharing
- Create a share link instead of sharing keys
- Set password protection
- Set expiry time (1 hour to 1 month)
- Enable "one-time view" for extra security
- Share the generated URL, not the key

### For Security
- Use strong passwords (8+ characters)
- Don't share encryption keys
- Use share links for collaboration
- Check activity logs regularly (admin)
- Regenerate keys for sensitive files

## Troubleshooting

### "File upload failed"
- Check file size
- Verify internet connection
- Check browser console for details

### "Decryption failed: Invalid key"
- Make sure you copied the correct key
- Check for extra spaces or characters
- Key is case-sensitive

### Can't find my encryption key
- Check My Files page (upload info is not saved)
- Look in password manager
- Check email (if you saved it)
- Check recent documents/downloads

### Decrypted file looks corrupted
- Make sure you used the correct key
- File may have been corrupted during upload
- Try re-uploading

### Can't login
- Check email and password
- Account may be locked (5 failed attempts)
- Wait 15 minutes and try again
- Check email for typos

## Keyboard Shortcuts

- **Ctrl/Cmd + D**: Download (when in decrypt modal)
- **Esc**: Close modals
- **Ctrl/Cmd + K**: Search (when available)

## Best Practices

1. **Save Keys Immediately**
   - Don't wait to save keys later
   - Save after every upload
   - Organize keys by filename

2. **Use Strong Passwords**
   - Mix uppercase, lowercase, numbers, symbols
   - Avoid personal information
   - Use unique passwords

3. **Backup Important Files**
   - Keep local backup of important files
   - Test decryption occasionally
   - Don't rely only on encryption

4. **For Sharing**
   - Create share links instead of sharing keys
   - Use password protection
   - Set appropriate expiry times
   - Use one-time view for sensitive data

5. **Monitor Activity**
   - Check admin dashboard (if admin)
   - Review access logs
   - Rotate keys for sensitive files

## File Type Support

Supported file types:
- **Documents**: PDF, DOCX, TXT, XLSX
- **Images**: PNG, JPG, GIF, WEBP
- **Archives**: ZIP, RAR, 7Z
- **Video**: MP4, MKV, AVI
- **Audio**: MP3, WAV, FLAC
- **Any other**: Binary files supported

## Account Settings

Currently available:
- Theme toggle (Dark/Light mode)
- Theme is saved to your profile
- Login history in activity logs

Coming soon:
- Password change
- Email change
- 2FA setup
- WebAuthn biometric login

## Admin Features

If you have admin access:
- View all users
- See platform statistics
- Monitor system health
- Export activity logs
- View suspicious activity alerts
- Daily/weekly activity graphs

## API & Development

For developers:
- All services are in `src/services/`
- Encryption is in `src/utils/crypto.ts`
- Database schema in Supabase
- Full TypeScript support

## Support & Contact

- Check README.md for technical details
- Review code comments for implementation
- Check browser console for errors
- Supabase dashboard for database issues

## Version Info

- React 18.3.1
- TypeScript 5.5.3
- Supabase Backend
- AES-256-GCM Encryption
- Shamir Secret Sharing (3-part recovery)

## Privacy & Security

- Zero-Knowledge Architecture
- Files encrypted before upload
- Server never sees plaintext
- Keys not stored on server
- End-to-end encrypted
- Full audit logging

## Next Steps

1. Create your account
2. Upload your first file
3. **SAVE YOUR ENCRYPTION KEY**
4. Try decrypting the file
5. Explore other features
6. Create secure notes
7. Try sharing files

---

**Remember**: Your encryption key is essential. Losing it means losing access to your files. Save it now!
