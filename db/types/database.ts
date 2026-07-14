export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type GameStatus =
  | "draft"
  | "live"
  | "paused"
  | "tally_pending"
  | "pending_settlement"
  | "closed"
  | "cancelled";

export type GameType = "poker_night" | "score_tracker" | "pot_splitter" | "tournament" | "custom_game";

export type BuyInPaymentStatus = "paid" | "unpaid" | "settled_later";

export type SettlementMode = "direct" | "host";

export type SettlementLineStatus = "pending" | "partially_paid" | "paid";

export type RallyStatus = "draft" | "active" | "completed" | "cancelled";

export type RallyCheckInStatus = "pending" | "approved" | "rejected";

export type RallyJoinRequestStatus = "pending" | "approved" | "declined";

export type Host = {
  id: string;
  clerk_user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Player = {
  id: string;
  host_id: string;
  name: string;
  name_normalized: string;
  upi_id: string | null;
  avatar_key: string | null;
  color_key: string | null;
  linked_clerk_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Game = {
  id: string;
  host_id: string;
  game_night_id: string | null;
  game_type: GameType;
  status: GameStatus;
  name: string;
  location: string | null;
  public_token: string;
  tally_discrepancy_note: string | null;
  started_at: string | null;
  ended_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PokerGameConfig = {
  id: string;
  game_id: string;
  ratio_money_amount: number;
  ratio_coin_amount: number;
  min_buy_in_coins: number;
  max_buy_in_coins_per_player: number | null;
  starting_coin_amount: number;
  allow_rebuys: boolean;
  created_at: string;
  updated_at: string;
};

export type GamePlayer = {
  id: string;
  game_id: string;
  player_id: string;
  seating_order: number;
  is_host_player: boolean;
  joined_late: boolean;
  left_early: boolean;
  removed_before_start: boolean;
  active_in_game: boolean;
  advance_money: number;
  created_at: string;
  updated_at: string;
};

export type PokerBuyIn = {
  id: string;
  game_id: string;
  game_player_id: string;
  money_amount: number;
  coin_amount: number;
  payment_status: BuyInPaymentStatus;
  note: string | null;
  created_by_host_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  reversal_reason: string | null;
};

export type PokerFinalTally = {
  id: string;
  game_id: string;
  game_player_id: string;
  final_coin_count: number;
  final_value_money: number;
  total_buy_in_money: number;
  net_result_money: number;
  created_at: string;
  updated_at: string;
};

export type SettlementBatch = {
  id: string;
  game_id: string;
  mode: SettlementMode;
  is_active: boolean;
  generated_at: string;
  manually_edited: boolean;
  created_at: string;
  updated_at: string;
};

export type SettlementLine = {
  id: string;
  settlement_batch_id: string;
  game_id: string;
  from_game_player_id: string;
  to_game_player_id: string;
  amount: number;
  paid_amount: number;
  status: SettlementLineStatus;
  note: string | null;
  manually_edited: boolean;
  checked_by_host_id: string | null;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Rally = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: RallyStatus;
  public_token: string;
  created_at: string;
  updated_at: string;
};

export type RallyMember = {
  id: string;
  rally_id: string;
  player_id: string;
  is_host_member: boolean;
  joined_on: string;
  created_at: string;
  updated_at: string;
};

export type RallyCheckIn = {
  id: string;
  rally_id: string;
  rally_member_id: string;
  check_in_date: string;
  message: string | null;
  proof_image_url: string | null;
  status: RallyCheckInStatus;
  decided_by_host: boolean;
  created_at: string;
  updated_at: string;
};

export type RallyVote = {
  id: string;
  check_in_id: string;
  voter_member_id: string;
  vote: boolean;
  created_at: string;
};

export type RallyJoinRequest = {
  id: string;
  rally_id: string;
  clerk_user_id: string;
  email: string;
  display_name: string;
  status: RallyJoinRequestStatus;
  created_at: string;
  updated_at: string;
};

export type GameEvent = {
  id: string;
  game_id: string;
  host_id: string;
  event_type: string;
  event_payload: Json | null;
  created_at: string;
};

type Insertable<Row, Optional extends keyof Row = never> = Omit<Row, "id" | "created_at" | "updated_at" | Optional> &
  Partial<Pick<Row, Extract<"id" | "created_at" | "updated_at" | Optional, keyof Row>>>;

export type Database = {
  public: {
    Tables: {
      hosts: {
        Row: Host;
        Insert: Insertable<Host, "avatar_url">;
        Update: Partial<Omit<Host, "id" | "created_at">>;
        Relationships: [];
      };
      players: {
        Row: Player;
        Insert: Insertable<Player, "upi_id" | "avatar_key" | "color_key" | "linked_clerk_user_id">;
        Update: Partial<Omit<Player, "id" | "host_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "players_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: Game;
        Insert: Insertable<
          Game,
          | "game_night_id"
          | "game_type"
          | "status"
          | "location"
          | "tally_discrepancy_note"
          | "started_at"
          | "ended_at"
          | "closed_at"
          | "cancelled_at"
        >;
        Update: Partial<Omit<Game, "id" | "host_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "games_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_game_configs: {
        Row: PokerGameConfig;
        Insert: Insertable<PokerGameConfig, "max_buy_in_coins_per_player" | "allow_rebuys">;
        Update: Partial<Omit<PokerGameConfig, "id" | "game_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "poker_game_configs_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      game_players: {
        Row: GamePlayer;
        Insert: Insertable<
          GamePlayer,
          "is_host_player" | "joined_late" | "left_early" | "removed_before_start" | "active_in_game" | "advance_money"
        >;
        Update: Partial<Omit<GamePlayer, "id" | "game_id" | "player_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_buy_ins: {
        Row: PokerBuyIn;
        Insert: Insertable<PokerBuyIn, "payment_status" | "note" | "deleted_at" | "reversal_reason">;
        Update: Partial<Omit<PokerBuyIn, "id" | "game_id" | "game_player_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "poker_buy_ins_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poker_buy_ins_game_player_id_fkey";
            columns: ["game_player_id"];
            isOneToOne: false;
            referencedRelation: "game_players";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_final_tallies: {
        Row: PokerFinalTally;
        Insert: Insertable<PokerFinalTally>;
        Update: Partial<Omit<PokerFinalTally, "id" | "game_id" | "game_player_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "poker_final_tallies_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poker_final_tallies_game_player_id_fkey";
            columns: ["game_player_id"];
            isOneToOne: false;
            referencedRelation: "game_players";
            referencedColumns: ["id"];
          },
        ];
      };
      settlement_batches: {
        Row: SettlementBatch;
        Insert: Insertable<SettlementBatch, "is_active" | "generated_at" | "manually_edited">;
        Update: Partial<Omit<SettlementBatch, "id" | "game_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "settlement_batches_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      settlement_lines: {
        Row: SettlementLine;
        Insert: Insertable<
          SettlementLine,
          "paid_amount" | "status" | "note" | "manually_edited" | "checked_by_host_id" | "checked_at"
        >;
        Update: Partial<Omit<SettlementLine, "id" | "settlement_batch_id" | "game_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "settlement_lines_settlement_batch_id_fkey";
            columns: ["settlement_batch_id"];
            isOneToOne: false;
            referencedRelation: "settlement_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "settlement_lines_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      rallies: {
        Row: Rally;
        Insert: Insertable<Rally, "description" | "status">;
        Update: Partial<Omit<Rally, "id" | "host_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "rallies_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
        ];
      };
      rally_members: {
        Row: RallyMember;
        Insert: Insertable<RallyMember, "is_host_member" | "joined_on">;
        Update: Partial<Omit<RallyMember, "id" | "rally_id" | "player_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "rally_members_rally_id_fkey";
            columns: ["rally_id"];
            isOneToOne: false;
            referencedRelation: "rallies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rally_members_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      rally_check_ins: {
        Row: RallyCheckIn;
        Insert: Insertable<RallyCheckIn, "message" | "proof_image_url" | "status" | "decided_by_host">;
        Update: Partial<Omit<RallyCheckIn, "id" | "rally_id" | "rally_member_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "rally_check_ins_rally_id_fkey";
            columns: ["rally_id"];
            isOneToOne: false;
            referencedRelation: "rallies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rally_check_ins_rally_member_id_fkey";
            columns: ["rally_member_id"];
            isOneToOne: false;
            referencedRelation: "rally_members";
            referencedColumns: ["id"];
          },
        ];
      };
      rally_votes: {
        Row: RallyVote;
        Insert: Omit<RallyVote, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Pick<RallyVote, "vote">>;
        Relationships: [
          {
            foreignKeyName: "rally_votes_check_in_id_fkey";
            columns: ["check_in_id"];
            isOneToOne: false;
            referencedRelation: "rally_check_ins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rally_votes_voter_member_id_fkey";
            columns: ["voter_member_id"];
            isOneToOne: false;
            referencedRelation: "rally_members";
            referencedColumns: ["id"];
          },
        ];
      };
      rally_join_requests: {
        Row: RallyJoinRequest;
        Insert: Insertable<RallyJoinRequest, "status">;
        Update: Partial<Omit<RallyJoinRequest, "id" | "rally_id" | "clerk_user_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "rally_join_requests_rally_id_fkey";
            columns: ["rally_id"];
            isOneToOne: false;
            referencedRelation: "rallies";
            referencedColumns: ["id"];
          },
        ];
      };
      game_events: {
        Row: GameEvent;
        Insert: Omit<GameEvent, "id" | "created_at"> & { id?: string; created_at?: string; event_payload?: Json | null };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "game_events_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      game_status: GameStatus;
      game_type: GameType;
      buy_in_payment_status: BuyInPaymentStatus;
      settlement_mode: SettlementMode;
      settlement_line_status: SettlementLineStatus;
      rally_status: RallyStatus;
      rally_check_in_status: RallyCheckInStatus;
      rally_join_request_status: RallyJoinRequestStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
