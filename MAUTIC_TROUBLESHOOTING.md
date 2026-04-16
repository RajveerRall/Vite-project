# Mautic Email Troubleshooting Guide

This guide covers how to troubleshoot Mautic email sending issues when running Mautic in Docker Compose.

## Cron Job Location

Cron jobs are configured in:
```
/etc/cron.d/mautic
```

### View Current Cron Jobs
```bash
sudo cat /etc/cron.d/mautic
```

### Edit Cron Jobs
```bash
sudo nano /etc/cron.d/mautic
```

## Verify Cron Service Status

### Check if Cron is Running
```bash
sudo systemctl status cron
```

### Check if Cron is Enabled (starts on boot)
```bash
sudo systemctl is-enabled cron
```

### Start/Enable Cron Service
```bash
sudo systemctl start cron
sudo systemctl enable cron
```

## Verify Cron Jobs Are Executing

### Check Cron Execution Logs
```bash
# Check if Mautic cron jobs are running
sudo grep "mautic" /var/log/syslog | tail -20

# Or check cron-specific logs
sudo grep CRON /var/log/syslog | grep mautic | tail -20

# Watch cron logs in real-time
sudo tail -f /var/log/syslog | grep -E "(CRON|mautic)"
```

### Verify Cron File Permissions
```bash
# Check permissions (should be 644, owned by root)
ls -la /etc/cron.d/mautic

# Fix permissions if needed
sudo chmod 644 /etc/cron.d/mautic
sudo chown root:root /etc/cron.d/mautic
```

### Ensure File Ends with Newline
```bash
# Check if file ends with newline
tail -c 1 /etc/cron.d/mautic | od -c

# Add newline if missing
echo "" | sudo tee -a /etc/cron.d/mautic
```

## Test Mautic Commands Manually

### Test Email Sending (Critical)
```bash
docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:messages:send --env=prod
```

### Test Message Queue Processing
```bash
docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:campaigns:messagequeue --env=prod
```

### Test Campaign Commands
```bash
# Campaign trigger
docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:campaigns:trigger --env=prod

# Campaign execute
docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:campaigns:execute --env=prod

# Campaign rebuild
docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:campaigns:rebuild --env=prod

# Segments update
docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:segments:update --env=prod
```

## Enable Logging for Cron Jobs

### Temporarily Add Logging to Cron File

Edit `/etc/cron.d/mautic` and change the email sending line:

**Before (silent):**
```cron
*/5 * * * * root docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:messages:send --env=prod > /dev/null 2>&1
```

**After (with logging):**
```cron
*/5 * * * * root docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:messages:send --env=prod >> /var/log/mautic-email.log 2>&1
```

### Monitor Log File
```bash
# Watch log file in real-time
sudo tail -f /var/log/mautic-email.log

# View log contents
sudo cat /var/log/mautic-email.log
```

## Check Mautic Application Logs

### View Recent Errors
```bash
docker exec mautic-mautic-1 tail -100 /var/www/html/app/logs/prod.log | grep -i error
```

### View All Recent Logs
```bash
docker exec mautic-mautic-1 tail -50 /var/www/html/app/logs/prod.log
```

### Follow Logs in Real-Time
```bash
docker exec mautic-mautic-1 tail -f /var/www/html/app/logs/prod.log
```

## Check Docker Container Logs

### View Container Logs
```bash
# Last 50 lines
docker logs mautic-mautic-1 --tail 50

# Last 100 lines with errors
docker logs mautic-mautic-1 --tail 100 | grep -i error

# Follow logs in real-time
docker logs mautic-mautic-1 -f
```

## Verify Email Configuration in Mautic Dashboard

1. **Log into Mautic**: `https://mautic.yoread.com` (or your Mautic URL)
2. **Navigate to**: Settings → Configuration → Email Settings
3. **Verify**:
   - Mailer Transport: **SMTP** (not PHP mail)
   - SMTP Host: Your SMTP server
   - SMTP Port: Usually 587 (TLS) or 465 (SSL)
   - SMTP Username: Your SMTP username
   - SMTP Password: Your SMTP password
   - Encryption: TLS or SSL (match your port)
4. **Test Email**: Click "Send Test Email" button

## Check Email Queue Status

In Mautic Dashboard:
1. Go to **Channels → Emails → Queue**
2. Check if emails are queued but not sending
3. Look for error messages or failed emails

## Check Contact Activity Log

In Mautic Dashboard:
1. Go to **Contacts** → Find the contact
2. Click on the contact
3. Check **Activity Log** tab
4. Look for:
   - "Email sent" event
   - "Email queued" event
   - Any error messages

## Quick Diagnostic Script

Run this complete diagnostic:

```bash
#!/bin/bash
echo "=== Cron Service Status ==="
sudo systemctl status cron | head -5

echo -e "\n=== Cron File Permissions ==="
ls -la /etc/cron.d/mautic

echo -e "\n=== Recent Cron Executions ==="
sudo grep "mautic-mautic-1" /var/log/syslog | tail -5

echo -e "\n=== Testing Message Send Command ==="
docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:messages:send --env=prod

echo -e "\n=== Recent Mautic Errors ==="
docker exec mautic-mautic-1 tail -50 /var/www/html/app/logs/prod.log | grep -i error

echo -e "\n=== Container Logs (last 20 lines) ==="
docker logs mautic-mautic-1 --tail 20

echo -e "\n=== Docker is in PATH ==="
which docker
```

Save this as `mautic-diagnostic.sh`, make it executable, and run:
```bash
chmod +x mautic-diagnostic.sh
sudo ./mautic-diagnostic.sh
```

## Common Issues and Solutions

### Issue 1: Cron Jobs Not Running
**Symptoms**: No cron executions in logs
**Solutions**:
- Check cron service: `sudo systemctl status cron`
- Verify file permissions: `ls -la /etc/cron.d/mautic`
- Ensure file ends with newline
- Restart cron: `sudo systemctl restart cron`

### Issue 2: Cron Running But Emails Not Sending
**Symptoms**: Cron jobs execute but no emails sent
**Solutions**:
- Check SMTP configuration in Mautic dashboard
- Test email sending manually
- Check Mautic application logs for errors
- Verify email queue status in dashboard

### Issue 3: SMTP Connection Errors
**Symptoms**: Errors in Mautic logs about SMTP connection
**Solutions**:
- Verify SMTP credentials
- Check firewall rules (port 587/465)
- Test SMTP connection from server
- Verify SMTP server allows connections from your droplet IP

### Issue 4: Emails Queued But Not Processed
**Symptoms**: Emails in queue but not sending
**Solutions**:
- Verify cron jobs are running
- Check message queue command: `mautic:campaigns:messagequeue`
- Check Mautic logs for processing errors
- Verify SMTP is configured correctly

## Standard Cron Job Configuration

Here's the standard cron configuration for Mautic 5:

```cron
# Segments update
*/5 * * * * root docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:segments:update --env=prod > /dev/null 2>&1

# Campaign building
*/5 * * * * root docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:campaigns:update --env=prod > /dev/null 2>&1

# Campaign trigger (finds contacts that match campaign triggers)
*/5 * * * * root docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:campaigns:trigger --env=prod > /dev/null 2>&1

# Campaign execute (processes scheduled campaign events)
*/5 * * * * root docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:campaigns:execute --env=prod > /dev/null 2>&1

# Mautic 5 Message Queue (CRITICAL - runs every minute)
* * * * * root docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:campaigns:messagequeue --env=prod > /dev/null 2>&1

# Email sending (Mautic 5 uses messages:send, not emails:send)
*/5 * * * * root docker exec mautic-mautic-1 php /var/www/html/bin/console mautic:messages:send --env=prod > /dev/null 2>&1
```

## Container Information

- **Container Name**: `mautic-mautic-1`
- **Mautic Path**: `/var/www/html`
- **Logs Path**: `/var/www/html/app/logs/prod.log`
- **Console Command**: `/var/www/html/bin/console`

## Notes

- Mautic 5 uses `mautic:messages:send` instead of `mautic:emails:send`
- Message queue runs every minute (critical for email processing)
- Email sending runs every 5 minutes
- All commands use `--env=prod` for production environment
- Cron jobs redirect output to `/dev/null` to prevent log spam (remove for debugging)

## Related Files

- Edge Function: `supabase/functions/mautic-signup/index.ts`
- This function creates contacts in Mautic and triggers welcome emails via API








