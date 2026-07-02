export const ClientEvent = {
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  PLAYER_INPUT: 'player_input',
  REQUEST_REMATCH: 'request_rematch',
  LEAVE_ROOM: 'leave_room',
  PING: 'ping',
} as const;

export const ServerEvent = {
  ROOM_CREATED: 'room_created',
  PLAYER_JOINED: 'player_joined',
  GAME_STATE: 'game_state',
  GAME_START: 'game_start',
  GAME_OVER: 'game_over',
  PLAYER_DISCONNECTED: 'player_disconnected',
  PLAYER_RECONNECTED: 'player_reconnected',
  ERROR: 'error',
  ROOM_CLOSED: 'room_closed',
  REMATCH_REQUESTED: 'rematch_requested',
  PONG: 'pong',
} as const;

export type ClientEventType = (typeof ClientEvent)[keyof typeof ClientEvent];
export type ServerEventType = (typeof ServerEvent)[keyof typeof ServerEvent];
