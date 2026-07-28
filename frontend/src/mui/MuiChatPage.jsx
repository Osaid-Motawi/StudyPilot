import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';
import { useChatData } from '../hooks/useChatData.js';
import ChatThread from '../components/ChatThread.jsx';

// MUI presentation of AI Chat. Reuses the shared useChatData hook (single source
// of truth, incl. file-analysis) and the shared ChatThread composer. The chat
// fills the layout content area below the AppBar; a conversations panel sits on
// the left (permanent on md+, temporary Drawer on mobile).
const SIDEBAR_WIDTH = 260;
// Height of the fixed content area = viewport minus the AppBar Toolbar (~64px).
const CONTENT_HEIGHT = 'calc(100vh - 64px)';

export default function MuiChatPage() {
  const {
    chats,
    active,
    listError,
    sidebarOpen,
    setSidebarOpen,
    openChat,
    startNewChat,
    handleSend,
  } = useChatData();

  const conversationList = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.5, gap: 1 }}>
      <Button startIcon={<AddIcon />} fullWidth onClick={startNewChat}>
        New chat
      </Button>
      {listError && <Alert severity="error">{listError}</Alert>}
      <List sx={{ overflowY: 'auto', flex: 1 }}>
        {chats.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: 1, py: 0.5, fontSize: '0.9rem' }}>
            No conversations yet.
          </Typography>
        ) : (
          chats.map((c) => (
            <ListItemButton
              key={c.id}
              selected={active?.id === c.id}
              onClick={() => openChat(c.id)}
              sx={{ borderRadius: 2, mb: 0.25 }}
            >
              <ListItemText
                primary={c.title || 'Untitled chat'}
                primaryTypographyProps={{
                  noWrap: true,
                  fontSize: '0.9rem',
                  fontWeight: active?.id === c.id ? 700 : 500,
                }}
              />
            </ListItemButton>
          ))
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: CONTENT_HEIGHT, minHeight: 0 }}>
      {/* Conversations: permanent panel on md+, temporary drawer on mobile */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          display: { xs: 'none', md: 'block' },
          bgcolor: 'background.paper',
        }}
      >
        {conversationList}
      </Box>
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {conversationList}
      </Drawer>

      {/* Main conversation */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
        <Toolbar variant="dense" sx={{ display: { md: 'none' }, borderBottom: 1, borderColor: 'divider' }}>
          <IconButton edge="start" aria-label="Show conversations" onClick={() => setSidebarOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography sx={{ ml: 1 }}>Chats</Typography>
        </Toolbar>
        {/* ChatThread is a Classic-styled component (composer, bubbles). Wrap it
            in .classic-root so its element styles resolve inside the MUI tree. */}
        <Box className="classic-root" sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <ChatThread
            key={active?.id || 'new'}
            messages={active.messages}
            onSend={handleSend}
            autoFocus
            greeting={{
              title: 'How can I help you study?',
              subtitle:
                'Ask anything, or attach a PDF/.txt with + to chat about its content.',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
