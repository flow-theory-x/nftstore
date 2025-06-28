# API Comparison: Current Member API vs New Discord API

## Overview

This document compares the current member API with the new Discord API at https://web3.bon-soleil.com/api.

## 1. Endpoint Comparison

### Current API

- **Base URL**: `https://web3.bon-soleil.com/oldapi/member`
- **Endpoint**: `/member/:address`
- **Method**: GET
- **Purpose**: Retrieve member information by Ethereum address

### New API

- **Base URL**: `https://web3.bon-soleil.com/api`
- **Endpoint**: `/discord/eoa/:eoa`
- **Method**: GET
- **Purpose**: Retrieve Discord member information by Ethereum address (EOA)

## 2. Response Format Comparison

### Current API Response Fields

Based on the MemberInfo interface, the current API returns:

- `DeleteFlag` (boolean) - Member deletion status
- `DiscordId` (string) - Discord user ID
- `Icon` (string) - Avatar URL
- `Roles` (string[]) - Array of role names
- `Expired` (string) - Expiration date
- `Eoa` (string) - Ethereum address
- `Nick` (string) - Nickname/display name
- `PartitionName` (string) - Partition identifier
- `Updated` (string) - Last update timestamp
- `Name` (string) - Full name
- `Username` (string) - Discord username

### New API Response Format

```json
{
  "eoa_address": "0xcf20a6ecbbedb403db466d669229d9ee379c433f",
  "discord_member": {
    "user_id": "1285946299593523271",
    "username": "flow_theory_x",
    "display_name": "FLOW",
    "avatar": "44b83d1fe2f5ef25c489ef80cf441b41",
    "avatar_url": "https://cdn.discordapp.com/avatars/1285946299593523271/44b83d1fe2f5ef25c489ef80cf441b41.png",
    "joined_at": "2024-09-28T23:17:34.859000+00:00",
    "roles": [
      {
        "id": "1292767790092124264",
        "name": "Member",
        "color": 0,
        "position": 1
      }
    ],
    "premium_since": null
  },
  "registration_info": {
    "registered_at": null,
    "verified": true
  }
}
```

## 3. Field Mapping

| Current API Field | New API Field                  | Notes                                               |
| ----------------- | ------------------------------ | --------------------------------------------------- |
| `DiscordId`       | `discord_member.user_id`       | Direct mapping                                      |
| `Icon`            | `discord_member.avatar`        | Avatar hash only                                    |
| `Icon` (full URL) | `discord_member.avatar_url`    | Complete URL                                        |
| `Nick`            | `discord_member.display_name`  | Display name                                        |
| `Username`        | `discord_member.username`      | Discord username                                    |
| `Roles`           | `discord_member.roles`         | Changed from string[] to object[] with more details |
| `Eoa`             | `eoa_address`                  | Moved to root level                                 |
| `DeleteFlag`      | Not available                  | Missing in new API                                  |
| `Expired`         | Not available                  | Missing in new API                                  |
| `PartitionName`   | Not available                  | Missing in new API                                  |
| `Updated`         | Not available                  | Missing in new API                                  |
| `Name`            | Not available                  | Missing in new API                                  |
| -                 | `discord_member.joined_at`     | New field - when user joined Discord server         |
| -                 | `discord_member.premium_since` | New field - Nitro boost status                      |
| -                 | `registration_info`            | New field - EOA registration details                |

## 4. Key Differences

### Data Structure

1. **Nested Structure**: New API uses nested structure with `discord_member` and `registration_info` objects
2. **Role Details**: New API provides rich role information (id, name, color, position) vs simple string array
3. **Avatar Handling**: New API provides both hash and full URL separately

### Missing Fields

The following fields from the current API are not available in the new API:

- `DeleteFlag` - Member deletion status
- `Expired` - Member expiration date
- `PartitionName` - Partition identifier
- `Updated` - Last update timestamp
- `Name` - Full name field

### New Fields

The new API provides additional information:

- `joined_at` - Discord server join date
- `premium_since` - Discord Nitro boost status
- `registration_info.verified` - EOA verification status
- `registration_info.registered_at` - EOA registration timestamp
- Role color and position information

### Error Handling

- **Current API**: Returns `{"message": "member not found"}` for non-existent members
- **New API**: Returns `{"error": "No Discord user found for this EOA address", "eoa_address": "..."}` for non-registered addresses

## 5. API Behavior

### Case Sensitivity

- Both APIs handle Ethereum address case variations correctly
- The new API normalizes addresses to lowercase in responses

### Authentication

- Current API: No authentication required
- New API: No authentication required for `/discord/eoa/:eoa` endpoint

## 6. Test Data

### Example Working Address

- Address: `0xcf20a6ecbbedb403db466d669229d9ee379c433f`
- Discord User: FLOW (flow_theory_x)
- User ID: 1285946299593523271

## 7. Migration Considerations

### Required Code Changes

1. Update API endpoint URL
2. Modify response parsing to handle nested structure
3. Update field mappings (e.g., `Icon` → `discord_member.avatar_url`)
4. Handle missing fields (DeleteFlag, Expired, etc.)
5. Adapt role handling from string[] to object[]

### Potential Issues

1. **Missing Expiration Data**: The new API doesn't provide member expiration information
2. **No Deletion Flag**: Can't determine if a member has been deleted
3. **No Update Tracking**: No timestamp for when member data was last updated
4. **Different Error Format**: Error responses have different structure

### Benefits of New API

1. Richer role information with colors and positions
2. Discord server join date tracking
3. EOA registration verification status
4. Direct avatar URL without needing to construct it
5. Cleaner, more structured response format
