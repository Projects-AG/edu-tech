import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ModuleCard from '../../common/ModuleCard';
import StatusChip from '../../common/StatusChip';

function FileIcon({ type }) {
  if (type === 'XLSX') return <GridOnOutlinedIcon fontSize="small" color="success" />;
  if (type === 'DOCX') return <DescriptionOutlinedIcon fontSize="small" color="info" />;
  return <PictureAsPdfOutlinedIcon fontSize="small" color="error" />;
}

export default function DocumentsRegistry({ documents = [] }) {
  return (
    <ModuleCard sx={{ overflowX: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Institutional Evidence Registry
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Showing evidence files across Criteria 1–7
          </Typography>
        </Box>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            {['Document / Evidence', 'Criterion', 'Department', 'Uploaded By', 'Date', 'Status', 'Action'].map(
              (h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {h}
                </TableCell>
              ),
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id} hover>
              <TableCell>
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <Box sx={{ mt: 0.3 }}>
                    <FileIcon type={doc.type} />
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      {doc.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {doc.meta}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{doc.criterion}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {doc.department}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {doc.unit}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {doc.uploadedBy}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {doc.role}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{doc.uploadedAt}</Typography>
              </TableCell>
              <TableCell>
                <StatusChip label={doc.status} />
              </TableCell>
              <TableCell>
                <Button size="small" sx={{ fontWeight: 700 }}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ModuleCard>
  );
}
