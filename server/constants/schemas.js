import { z } from 'zod';

// --- Shared enums ---
const priorityEnum = z.enum(['low', 'medium', 'high', 'critical']);
const ticketTypeEnum = z.enum(['task', 'request', 'issue']);
const guestImpactEnum = z.enum(['none', 'low', 'medium', 'high']);
const guestRoomOccupiedEnum = z.enum(['yes', 'no', 'unknown']);

// Reusable nullable int (for FK references like room_id, asset_id, etc.)
const nullableId = z.union([z.coerce.number().int().positive(), z.literal(''), z.null()]).optional().transform(v => v === '' ? null : v || null);

// --- Create Ticket ---
export const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer').trim(),
  description: z.string().max(5000, 'Description must be 5000 characters or fewer').optional().default(''),
  priority: priorityEnum.optional().default('medium'),
  ticket_type: ticketTypeEnum.optional().default('issue'),
  category_id: nullableId,
  department: z.string().max(100).optional().default(''),
  room_id: nullableId,
  asset_id: nullableId,
  guest_impact: guestImpactEnum.optional().default('none'),
  guest_room_occupied: guestRoomOccupiedEnum.optional().default('unknown'),
  guest_name: z.string().max(100).optional().default(''),
  booking_reference: z.string().max(100).optional().default(''),
  out_of_order_room: z.union([z.boolean(), z.literal('true'), z.literal('false')]).optional().transform(v => v === 'true' ? true : v === 'false' ? false : v || false),
  requires_vendor: z.enum(['yes', 'no']).optional().default('no'),
  vendor_name: z.string().max(200).optional().default(''),
  cost_estimate: z.union([z.coerce.number().nonnegative(), z.literal(''), z.null()]).optional().transform(v => v === '' ? null : v || null),
  hotel_id: nullableId,
});

// --- Update Ticket (all fields optional) ---
export const updateTicketSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(200).trim().optional(),
  description: z.string().max(5000).optional(),
  priority: priorityEnum.optional(),
  ticket_type: ticketTypeEnum.optional(),
  category_id: nullableId,
  department: z.string().max(100).optional(),
  room_id: nullableId,
  asset_id: nullableId,
  guest_impact: guestImpactEnum.optional(),
  guest_room_occupied: guestRoomOccupiedEnum.optional(),
  guest_name: z.string().max(100).optional(),
  booking_reference: z.string().max(100).optional(),
  out_of_order_room: z.union([z.boolean(), z.literal('true'), z.literal('false')]).optional().transform(v => v === 'true' ? true : v === 'false' ? false : v),
  requires_vendor: z.enum(['yes', 'no']).optional(),
  vendor_name: z.string().max(200).optional(),
  cost_estimate: z.union([z.coerce.number().nonnegative(), z.literal(''), z.null()]).optional().transform(v => v === '' ? null : v),
  actual_cost: z.union([z.coerce.number().nonnegative(), z.literal(''), z.null()]).optional().transform(v => v === '' ? null : v),
  hotel_id: nullableId,
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided.' });

// --- Guest Ticket ---
export const guestTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().max(3000).optional().default(''),
  guest_name: z.string().min(1, 'Guest name is required').max(100).trim(),
  guest_position: z.string().min(1, 'Position is required').max(100).trim(),
  department: z.string().min(1, 'Department is required').max(100).trim(),
  hotel_id: z.coerce.number().int().positive('Hotel is required'),
  room_id: nullableId,
  category_id: nullableId,
  _phone_ext: z.string().max(0, 'Invalid request').optional().default(''), // honeypot
});

// --- Status Change ---
export const statusChangeSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  note: z.string().max(1000).optional(),
  cancellation_reason: z.string().max(1000).optional(),
});
