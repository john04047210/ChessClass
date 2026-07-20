import type {PlayerProfile} from "@/lib/types";

export type AvatarKind="player"|"opponent"|"coach";

export function Avatar({kind,profile,size="medium"}:{kind:AvatarKind;profile?:PlayerProfile;size?:"small"|"medium"|"large"}){
  const glyph=kind==="player"?(profile?.avatarId==="male"?"👨":profile?.avatarId==="female"?"👩":"🧑"):kind==="opponent"?"💻":"🧑‍🏫";
  return <span className={`role-avatar avatar-${kind} avatar-${size}`} aria-hidden="true">{glyph}</span>;
}
