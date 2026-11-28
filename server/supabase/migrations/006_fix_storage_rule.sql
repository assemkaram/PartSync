
update public.compatibility_rules
set
    rule_type = 'custom',
    message = 'The build uses more M.2 drives than the motherboard has slots.'
where
    rule_key = 'storage_motherboard_interface';