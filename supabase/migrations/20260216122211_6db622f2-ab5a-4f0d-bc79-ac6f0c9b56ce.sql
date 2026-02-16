
-- Update notify_note_comment to also notify @mentioned users
CREATE OR REPLACE FUNCTION public.notify_note_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_note_title text;
  v_note_owner_id uuid;
  v_commenter_name text;
  v_preview text;
  v_target_id uuid;
  v_mention text;
  v_mentioned_id uuid;
  v_notified_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT title, user_id INTO v_note_title, v_note_owner_id FROM notes WHERE id = NEW.note_id;
  SELECT full_name INTO v_commenter_name FROM profiles WHERE id = NEW.user_id;
  v_preview := LEFT(NEW.content, 100);

  -- Notify note owner if commenter is not the owner
  IF v_note_owner_id IS NOT NULL AND v_note_owner_id != NEW.user_id THEN
    INSERT INTO note_comment_notifications (user_id, note_id, comment_id, commenter_name, note_title, comment_preview)
    VALUES (v_note_owner_id, NEW.note_id, NEW.id, COALESCE(v_commenter_name, 'Un utente'), v_note_title, v_preview);
    v_notified_ids := array_append(v_notified_ids, v_note_owner_id);
  END IF;

  -- Notify all shared users except the commenter
  FOR v_target_id IN
    SELECT shared_with_user_id FROM note_shares 
    WHERE note_id = NEW.note_id 
    AND shared_with_user_id IS NOT NULL 
    AND shared_with_user_id != NEW.user_id
  LOOP
    IF NOT (v_target_id = ANY(v_notified_ids)) THEN
      INSERT INTO note_comment_notifications (user_id, note_id, comment_id, commenter_name, note_title, comment_preview)
      VALUES (v_target_id, NEW.note_id, NEW.id, COALESCE(v_commenter_name, 'Un utente'), v_note_title, v_preview);
      v_notified_ids := array_append(v_notified_ids, v_target_id);
    END IF;
  END LOOP;

  -- Notify @mentioned users (parse @FullName patterns)
  FOR v_mention IN
    SELECT (regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)*)', 'g'))[1]
  LOOP
    SELECT id INTO v_mentioned_id FROM profiles WHERE full_name ILIKE v_mention LIMIT 1;
    IF v_mentioned_id IS NOT NULL AND v_mentioned_id != NEW.user_id AND NOT (v_mentioned_id = ANY(v_notified_ids)) THEN
      INSERT INTO note_comment_notifications (user_id, note_id, comment_id, commenter_name, note_title, comment_preview)
      VALUES (v_mentioned_id, NEW.note_id, NEW.id, COALESCE(v_commenter_name, 'Un utente'), v_note_title, '📢 Ti ha menzionato: ' || v_preview);
      v_notified_ids := array_append(v_notified_ids, v_mentioned_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;
