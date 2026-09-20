-- Task 28: store canonical Day content under the explicit content_blocks name.
alter table public.days rename column blocks to content_blocks;