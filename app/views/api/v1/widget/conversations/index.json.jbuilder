if @conversation
  json.id @conversation.display_id
  json.inbox_id @conversation.inbox_id
  json.contact_last_seen_at @conversation.contact_last_seen_at.to_i
  json.agent_last_seen_at(@conversation.agent_last_seen_at&.to_i || 0)
  json.status @conversation.status
end
