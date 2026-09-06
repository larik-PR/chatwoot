require 'rails_helper'

RSpec.describe 'Praxis bridge context', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent, name: 'Praxis Agent') }
  let(:path) { "/api/v1/accounts/#{account.id}/praxis_bridge/context" }
  let(:secret) { 'test-dashboard-secret' }

  it 'returns unauthorized without an authenticated agent session' do
    get path

    expect(response).to have_http_status(:unauthorized)
  end

  it 'returns a signed context for the authenticated agent' do
    now = Time.zone.parse('2026-09-06 12:00:00 UTC')

    with_modified_env CHATWOOT_DASHBOARD_SECRET: secret do
      travel_to(now) do
        get path, headers: agent.create_new_auth_token
      end
    end

    expect(response).to have_http_status(:ok)
    body = response.parsed_body
    decoded_context = JSON.parse(Base64.urlsafe_decode64(body.fetch('context')))
    expect(decoded_context).to eq(
      'accountId' => account.id,
      'agentId' => agent.id,
      'agentName' => 'Praxis Agent',
      'issuedAt' => now.iso8601,
      'expiresAt' => (now + 10.minutes).iso8601
    )
    expect(body.fetch('expiresAt')).to eq((now + 10.minutes).iso8601)
    expect(body.fetch('signature')).to eq(
      "sha256=#{OpenSSL::HMAC.hexdigest('SHA256', secret, body.fetch('context'))}"
    )
  end
end
