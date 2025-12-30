# Highline Ops - Demo Setup

## Quick Start

The database has been seeded with demo data including:
- Demo organization: "Demo Highline"
- 2 properties (Park Avenue Tower, Chelsea Commons)
- 5 vendors with compliance records
- 3 employees
- Categories, SLA rules, GL codes, and cost centers

## Demo Login Credentials

A demo account has been created for immediate testing:

**Email:** cihan@highlinebldg.com
**Password:** hbs9393
**Role:** Director (full access to all features)

Simply use these credentials on the login page to access the platform.

## Demo Data Structure

### Properties
- **Park Avenue Tower** - 250,000 RSF office building in Midtown
- **Chelsea Commons** - 180,000 RSF multifamily in Chelsea (4 units)

### Vendors
- Metro HVAC Services (Rating: 92)
- City Electric Inc (Rating: 88)
- Empire Plumbing (Rating: 85) - COI expiring soon
- Otis Elevator Service (Rating: 95)
- SecureNY (Rating: 90) - COI expiring soon

### Sample Workflows

1. **View Dashboard** - See key metrics, alerts, and financial summary
2. **Manage Work Orders** - Create, assign, and track maintenance requests
3. **Monitor Compliance** - Track vendor COI status and expiration alerts
4. **Review Scores** - Check TSI, PM Communication, and Vendor scores

## Next Steps

After creating a user account:
1. Sign in with your credentials
2. Explore the Director Dashboard
3. Navigate to Work Orders to see the management interface
4. Check vendor compliance status
5. Review exception alerts

## Technical Notes

- All data is scoped by `org_id` for multi-tenancy
- RLS policies enforce role-based access control
- Default timezone: America/New_York
- SLA rules configured for emergency (4h), high (24h), normal (72h), low (120h)
