export type UserPermissions={
  role_label:string;
  can_manage_matches:boolean;
  can_edit_match_events:boolean;
  can_manage_training:boolean;
  can_manage_training_attendance:boolean;
  can_manage_calendar:boolean;
  can_manage_news:boolean;
  can_manage_players:boolean;
};

export const EMPTY_PERMISSIONS:UserPermissions={
  role_label:"Rodzic",
  can_manage_matches:false,
  can_edit_match_events:false,
  can_manage_training:false,
  can_manage_training_attendance:false,
  can_manage_calendar:false,
  can_manage_news:false,
  can_manage_players:false,
};

export function hasDelegatedAccess(p:UserPermissions){
  return p.can_manage_matches||p.can_edit_match_events||p.can_manage_training||p.can_manage_training_attendance||p.can_manage_calendar||p.can_manage_news||p.can_manage_players;
}
