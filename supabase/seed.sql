-- Sample household data for local development. Fictional names only.
-- Run in the Supabase SQL Editor after the migration.

insert into public.roommates (name, is_active) values
  ('Avery Chen', true),
  ('Jordan Blake', true),
  ('Sam Rivera', true),
  ('Riley Patel', true);

insert into public.chores (name, description, difficulty, is_active) values
  ('Kitchen reset', 'Wipe counters, load dishwasher, take out compost.', 3, true),
  ('Bathroom clean', 'Sink, toilet, shower, and floor.', 5, true),
  ('Trash and recycling', 'All bins out to the curb and liners replaced.', 2, true),
  ('Living room tidy', 'Fold blankets, vacuum, reset coffee table.', 2, true),
  ('Hall and entry', 'Shoes away, sweep, wipe the door handle.', 1, true),
  ('Fridge check', 'Toss leftovers past it, wipe shelves, note groceries.', 4, true);
