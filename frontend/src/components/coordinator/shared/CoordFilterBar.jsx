import { Button, MenuItem, Stack, TextField } from '@mui/material';
import ModuleCard from '../../common/ModuleCard';

/** Simple search + select filters used by coordinator list pages. */
export default function CoordFilterBar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onReset,
  action,
}) {
  return (
    <ModuleCard sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          sx={{ flex: 1, minWidth: 180 }}
        />
        {filters.map((filter) => (
          <TextField
            key={filter.id}
            select
            size="small"
            value={filter.value}
            onChange={(e) => filter.onChange?.(e.target.value)}
            sx={{ minWidth: { xs: '100%', md: 160 } }}
          >
            {filter.options.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        ))}
        {onReset ? (
          <Button onClick={onReset} sx={{ whiteSpace: 'nowrap' }}>
            Reset Filters
          </Button>
        ) : null}
        {action}
      </Stack>
    </ModuleCard>
  );
}
