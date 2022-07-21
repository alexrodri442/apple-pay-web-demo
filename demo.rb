require  'sinatra' # Web Framework
require 'http' # HTTP library for making API requests
require 'json' # JSON parsing/encoding
require 'fat_zebra' # Talking to the FZ Gateway

set :public_folder, __dir__ + '/static'

GW_USERNAME = ENV.fetch('GATEWAY_USERNAME', 'TEST')
GW_TOKEN = ENV.fetch('GATEWAY_TOKEN', 'TEST')

FatZebra.configure do |config|
  config.username = GW_USERNAME
  config.token = GW_TOKEN
  config.gateway = :sandbox
end

get '/' do
  erb :index
end

post '/start-applepay-session' do
  payload = JSON.parse(request.body.read)

  puts "Payload: #{payload}"

  # Make the request to Fat Zebra to setup the payment session
  res = HTTP
          .basic_auth(user: GW_USERNAME, pass: GW_TOKEN)
          .get("https://paynow.pmnts-sandbox.io/v2/apple_pay/payment_session?url=#{payload['validationUrl']}&domain_name=#{payload['domainName']}")

  if res.status == 200
    content_type :json
    res.body
  else
    halt 422, "Something bad happened"
  end
end

post '/transact' do
  content_type :json

  payload = JSON.parse(request.body.read)
  
  purchase = FatZebra::Purchase.create(
    amount: 100,
    reference: SecureRandom.hex,
    customer_ip: '1.1.1.1',
    wallet: {
      type: 'APPLEPAYWEB',
      token: payload.dig('payment', 'token')
    }
  )

  if purchase.errors.any?
    halt 422, {
                successful: false,
                errors: purchase.errors
              }.to_json
  else
    {
      successful: true,
      purchase: purchase.to_hash
    }.to_json
  end
end
