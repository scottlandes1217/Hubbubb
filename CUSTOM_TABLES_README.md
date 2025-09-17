# Custom Tables and Fields Feature

This feature allows organizations to create their own custom tables and fields, similar to Salesforce's custom objects and fields. Organizations can define their own data structures and collect information specific to their needs.

## Features

### Custom Tables
- **Create Custom Tables**: Organizations can create tables with custom names and descriptions
- **API Names**: Each table gets a unique API name for programmatic access
- **Active/Inactive Status**: Tables can be activated or deactivated
- **Organization-Specific**: Each table belongs to a specific organization

### Custom Fields
- **Multiple Field Types**: Support for various data types:
  - Text (single line)
  - Textarea (multi-line)
  - Number
  - Date
  - DateTime
  - Checkbox (boolean)
  - Picklist (single select)
  - Multi-Picklist (multiple select)
  - Email
  - Phone
  - URL
  - Currency
  - Percent
  - Lookup (reference to another table)
  - Formula (calculated fields)
  - Rollup (aggregated fields)

- **Field Properties**:
  - Required/Optional
  - Unique values
  - Active/Inactive
  - Hidden/Visible
  - Read-only/Editable
  - Custom descriptions

### Custom Records
- **Dynamic Data Entry**: Forms automatically adapt to field definitions
- **Field Validation**: Values are validated based on field type and rules
- **Bulk Operations**: View, edit, and delete records
- **External IDs**: Support for external system integration

## How to Use

### 1. Create a Custom Table
1. Navigate to your organization
2. Go to "Custom Tables" in the navigation menu
3. Click "Create New Table"
4. Fill in:
   - **Table Name**: Internal name (e.g., "Customer")
   - **Display Name**: User-friendly name (e.g., "Customers")
   - **API Name**: Technical name (auto-generated)
   - **Description**: What this table is used for
   - **Active**: Whether the table can be used

### 2. Add Custom Fields
1. Go to your custom table
2. Click "Add Field" or "Manage Fields"
3. Choose field type and configure:
   - **Field Name**: Internal name
   - **Display Name**: User-friendly name
   - **Field Type**: Data type (text, number, picklist, etc.)
   - **Required**: Whether the field is mandatory
   - **Unique**: Whether values must be unique
   - **Description**: Help text for users

### 3. Create Records
1. Go to your custom table
2. Click "Add Record"
3. Fill in the record name and description
4. Complete the dynamic form fields
5. Save the record

## Field Types Explained

### Text Fields
- **Text**: Single line of text
- **Textarea**: Multiple lines of text
- **Email**: Email address with validation
- **Phone**: Phone number
- **URL**: Web address with validation

### Numeric Fields
- **Number**: Any numeric value
- **Currency**: Monetary amounts
- **Percent**: Percentage values

### Date/Time Fields
- **Date**: Calendar date
- **DateTime**: Date and time

### Selection Fields
- **Checkbox**: True/False values
- **Picklist**: Single selection from predefined options
- **Multi-Picklist**: Multiple selections from predefined options

### Reference Fields
- **Lookup**: Reference to records in another custom table
- **Formula**: Calculated values based on other fields
- **Rollup**: Aggregated values from related records

## API Access

Custom tables and fields can be accessed programmatically using their API names:

```ruby
# Get a custom table
table = organization.custom_tables.find_by(api_name: 'customer')

# Get a custom field
field = table.custom_fields.find_by(api_name: 'email')

# Get field value for a record
record = table.custom_records.find(1)
email = record.field_value('email')

# Set field value
record.set_field_value('email', 'new@example.com')
```

## Database Schema

The feature uses four main tables:

1. **custom_tables**: Stores table definitions
2. **custom_fields**: Stores field definitions
3. **custom_records**: Stores record metadata
4. **custom_field_values**: Stores actual field values (flexible schema)

## Security

- Tables and fields are scoped to organizations
- Users can only access tables in their organizations
- Field-level permissions can be controlled via active/hidden flags

## Future Enhancements

- Field-level permissions
- Advanced validation rules
- Field dependencies and conditional logic
- Bulk import/export
- Reporting and analytics
- API rate limiting
- Webhook support for data changes

## Navigation

Access custom tables through:
- Main navigation dropdown → "Custom Tables"
- User dropdown → "Custom Tables" (organization section)

## Examples

### Customer Management
- Table: "Customer"
- Fields: Name, Email, Phone, Company, Status, Notes

### Product Catalog
- Table: "Product"
- Fields: Name, SKU, Price, Category, Description, Active

### Service Requests
- Table: "Service Request"
- Fields: Title, Description, Priority, Status, Assigned To, Due Date 