-- Own migration: a new enum value can't be used in the transaction that adds it.
alter type order_status add value if not exists 'pending_review' before 'placed';
