# Pekao Granizados POS - API & Backend Surface Documentation

This document describes the backend endpoints and RPC interfaces exposed by the Pekao Granizados POS platform, including Supabase Edge Functions and PostgreSQL/Supabase database RPC functions.

---

## 1. Supabase Edge Functions

These endpoints are deployed as Deno Edge Functions and run in isolated serverless environments, using the service role key to perform administrative operations.

### `POST /functions/v1/delete-user`

Deletes a user account from both Supabase Auth (`auth.users`) and public profiles, cascading all relational records.

- **Description:** Deletes a user by their unique identifier.
- **Authentication:** Bearer token (JWT in authorization header). Requester must have `admin`, `manager`, or `store_manager` role. A user cannot delete their own account.
- **Request Headers:**
  - `Authorization: Bearer <JWT>`
- **Request Body (JSON):**
  ```json
  {
    "userId": "uuid-of-user-to-delete"
  }
  ```
- **Response:**
  - `200 OK`
    ```json
    {
      "message": "User deleted successfully"
    }
    ```
  - `401 Unauthorized` / `403 Forbidden` / `400 Bad Request` / `500 Server Error`

### `POST /functions/v1/update-user`

Updates auth-level details (such as email or password) of a user by their identifier.

- **Description:** Updates the authentication record of a user.
- **Authentication:** Bearer token (JWT in authorization header). Requester must have `admin`, `manager`, or `store_manager` role.
- **Request Headers:**
  - `Authorization: Bearer <JWT>`
- **Request Body (JSON):**
  ```json
  {
    "userId": "uuid-of-user-to-update",
    "email": "new-email@domain.com",       // (Optional)
    "password": "new-secure-password"      // (Optional)
  }
  ```
- **Response:**
  - `200 OK`
    ```json
    {
      "message": "User updated successfully",
      "data": { ...supabaseUserData... }
    }
    ```
  - `401 Unauthorized` / `403 Forbidden` / `400 Bad Request` / `500 Server Error`

---

## 2. Supabase Database RPC Endpoints

These database-level functions (exposed as Remote Procedure Calls) encapsulate transactional business logic, ensuring race-condition prevention (using `FOR UPDATE` locks) and ACID compliance.

### `rpc('process_sale', { sale_data })`

Orchestrates the completion of a transaction: inserts an order, adds its items, deducts physical product stock, computes mixture volume deductions based on product configuration and recipe, and updates machine tanks.

- **Parameter:** `sale_data` (JSONB)
- **JSONB Payload Schema:**
  ```json
  {
    "store_id": "uuid",
    "employee_id": "uuid",
    "customer_id": "uuid",           // (Optional)
    "order_type": "pickup | delivery",
    "delivery_address": "string",     // (Optional)
    "delivery_phone": "string",       // (Optional)
    "subtotal": 12500,
    "tip_amount": 1000,
    "delivery_fee": 2000,
    "total": 15500,
    "payment": {
      "method": "cash | card | transfer",
      "amount_paid": 20000,
      "change": 4500
    },
    "items": [
      {
        "product_id": "uuid",
        "quantity": 2,
        "price": 6250,
        "name": "Granizado de Limón 10 Oz",
        "size": "10 Oz",
        "size_multiplier": 1.25
      }
    ]
  }
  ```
- **Returns:** `UUID` (ID of the newly created order)
- **Error Scenarios:** Throws an exception if required fields are missing, or if stock is locked or insufficient during mixture deduction.

### `rpc('update_order_with_stock', { order_update_data })`

Modifies an existing order's attributes, dynamically restoring previous stock/mixture allocations and applying the updated list of items with new deductions.

- **Security:** Requires the authenticated user to have the `admin` or `manager` role.
- **Parameter:** `order_update_data` (JSONB)
- **JSONB Payload Schema:**
  ```json
  {
    "order_id": "uuid",
    "status": "completed | pending | cancelled",
    "subtotal": 10000,
    "total": 10000
  }
  ```
- **Returns:** `UUID` (ID of the updated order)

### `rpc('cancel_sale_with_stock_restore', { p_order_id, p_reason })`

Cancels a completed order and restores all items to their respective stock and machine tanks.

- **Security:** Requires the authenticated user to have the `admin` or `manager` role.
- **Parameters:**
  - `p_order_id`: UUID
  - `p_reason`: Text (mandatory reason for cancellation)
- **Returns:** `void`

### `rpc('initialize_store_tanks', { p_store_id })`

Automatically populates and configures the `machine_tanks` table for a specific store using active mixture items from the store's inventory.

- **Security:** Requires store management/owner privileges.
- **Parameter:** `p_store_id`: UUID
- **Returns:** `integer` (Number of tanks initialized/synced)

### `rpc('increment_inventory_stock', { p_item_id, p_store_id, p_amount })`

Atomically increments the stock of an inventory item. Primarily used during new mix preparations.

- **Parameters:**
  - `p_item_id`: UUID
  - `p_store_id`: UUID
  - `p_amount`: Numeric (liters/ml to add)
- **Returns:** `void`
- **Error Scenarios:** Throws exception if the target inventory item is not found.
