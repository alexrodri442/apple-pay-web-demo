$().ready(function () {
  if (!window.ApplePaySession || !window.ApplePaySession.canMakePayments()) {
    alert("ApplePay cannot be used - please ensure you are using HTTPS");
  }

  $('apple-pay-button').on('click', function () {
    if (!ApplePaySession) {
      return;
    }

    const request = {
      countryCode: 'AU',
      currencyCode: 'AUD',
      supportedNetworks: ['visa', 'masterCard', 'amex'],
      merchantCapabilities: ['supports3DS'],
      total: { label: 'Test', type: 'final', amount: 100.0 }
    };

    const session = new ApplePaySession(3, request);

    session.onvalidatemerchant = function (event) {

      let validationPromise = validateMerchant(event.validationURL);
      $.when(validationPromise).then(function (merchantSession) {
        console.log("Merchant Session: ", merchantSession);
        session.completeMerchantValidation(merchantSession);
      }, function (error) {
        console.error("Merchant Validation Error: ", error);
        session.abort();
      });
    };

    session.onpaymentmethodselected = function (event) {
      console.log("Payment Method: ", event.paymentMethod);
      let amount = 100.0;

      const update = {
        newTotal: {
          label: 'Test',
          amount: amount,
          type: 'final'
        }
      };
      session.completePaymentMethodSelection(update);
    }

    session.onpaymentauthorized = function (event) {

      let authorisedPromise = paymentAuthorised(event.payment);
      $.when(authorisedPromise).then(function (data) {
        const result = {
          'status': ApplePaySession.STATUS_SUCCESS
        };
        session.completePayment(result);
        console.log("Payment Result: ", data);
        alert("Payment Successful. Transaction ID: " + data.purchase.id);
      }, function (error) {
        console.error("Payment Error: ", error);
        session.abort();
      });
    }

    session.oncancel = function (event) {

    }

    session.begin();
  });

});

function validateMerchant(validationUrl) {
  var dfd = $.Deferred();
  var requestData = {
    merchantTradingName: 'Test',
    validationUrl: validationUrl,
    domainName: location.host
  };
  $.ajax(
    {
      url: '/start-applepay-session',
      method: 'POST',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(requestData),
      success: function (data) {
        console.log("Merchant Validation Response: ", data);
        dfd.resolve(data);
      },
      error: function (req, status, error) {
        dfd.reject({ 'status': req.status, 'error': error });
      }
    });

  return dfd.promise();
}

function paymentAuthorised(payment) {
  var dfd = $.Deferred();

  $.ajax(
    {
      url: '/transact',
      method: 'POST',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({ payment: payment }),
      success: function (data) {
        dfd.resolve(data);
      },
      error: function (req, status, error) {
        dfd.reject({ 'status': req.status, 'error': error });
      }
    });

  return dfd.promise();
}