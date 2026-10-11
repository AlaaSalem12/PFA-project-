import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

export interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <Typography variant="body2" sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
            {children}
          </Typography>
        ),
        h1: ({ children }) => (
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            {children}
          </Typography>
        ),
        h2: ({ children }) => (
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            {children}
          </Typography>
        ),
        h3: ({ children }) => (
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            {children}
          </Typography>
        ),
        ul: ({ children }) => (
          <Box component="ul" sx={{ m: 0, mb: 1, pl: 2.5, typography: 'body2' }}>
            {children}
          </Box>
        ),
        ol: ({ children }) => (
          <Box component="ol" sx={{ m: 0, mb: 1, pl: 2.5, typography: 'body2' }}>
            {children}
          </Box>
        ),
        li: ({ children }) => <Box component="li">{children}</Box>,
        a: ({ href, children }) => (
          <Link href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </Link>
        ),
        pre: ({ children }) => (
          <Box
            component="pre"
            sx={{
              m: 0,
              mb: 1,
              p: 1.5,
              overflowX: 'auto',
              borderRadius: 1,
              bgcolor: 'action.hover',
              typography: 'body2',
              fontFamily: 'monospace',
              '& code': { bgcolor: 'transparent', p: 0 },
            }}
          >
            {children}
          </Box>
        ),
        code: ({ children }) => (
          <Box
            component="code"
            sx={{
              px: 0.5,
              borderRadius: 0.5,
              bgcolor: 'action.hover',
              fontFamily: 'monospace',
              fontSize: '0.85em',
            }}
          >
            {children}
          </Box>
        ),
        table: ({ children }) => (
          <TableContainer sx={{ mb: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Table size="small">{children}</Table>
          </TableContainer>
        ),
        thead: ({ children }) => <TableHead>{children}</TableHead>,
        tbody: ({ children }) => <TableBody>{children}</TableBody>,
        tr: ({ children }) => <TableRow>{children}</TableRow>,
        th: ({ children }) => (
          <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>{children}</TableCell>
        ),
        td: ({ children }) => <TableCell>{children}</TableCell>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
