require 'base64'
require 'openssl'

class Api::V1::Accounts::PraxisBridgeController < Api::V1::Accounts::BaseController
  def context
    issued_at = Time.current
    expires_at = issued_at + 10.minutes
    context = Base64.urlsafe_encode64(
      {
        accountId: Current.account.id,
        agentId: Current.user.id,
        agentName: Current.user.name,
        issuedAt: issued_at.iso8601,
        expiresAt: expires_at.iso8601
      }.to_json,
      padding: false
    )
    signature = OpenSSL::HMAC.hexdigest('SHA256', ENV.fetch('CHATWOOT_DASHBOARD_SECRET'), context)

    render json: { context: context, signature: "sha256=#{signature}", expiresAt: expires_at.iso8601 }
  end
end
