// login form
$('#login-form').submit(function (event) {
  event.preventDefault();
  $.ajax({
    type: 'POST',
    url: '/login',
    data: {
      email: $(this).find('input[name="email"]').val(),
      password: $(this).find('input[name="password"]').val(),
      qaKey: $(this).find('input[name="qaKey"]').val(),
      grecaptcha: grecaptcha.getResponse(0),
    },
    success(response) {
      if (response.success) {
        if (response.multiFactorAuthentication) {
          postForm('/login/multi-factor', { token: response.token, email: response.email, multiFactorAuthenticationType: response.multiFactorAuthenticationType }, 'POST');
          // TODO: Re-enable when password policy confirmed
          // } else if (response.passwordExpired) {
          //   return postForm('/expired', { token: response.token }, 'GET');
        } else {
          Cookies.set('curveToken', response.token, { secure: true });
          if (response.qaMode) { Cookies.set('qaMode', response.qaMode, { secure: true }); }

          // Redirect to the multi-factor authentication setup if payee/client with payments enabled and not currently using MFA
          if (response.mfaRequired) {
            postForm('/login/multi-factor/setup', { token: response.token, qrCode: response.qrCode, email: response.email }, 'POST');
          } else {
            window.location.replace(window.location.origin);
          }
        }
      } else {
        $('#notification').html(`<div class="alert alert-info" role="alert"><h4 class="pull-left">Error Logging In</h4><br><p>${response.message}</p></div>`);
      }
    },
  });
});

// Multi Factor Auth form
$('#mfa-form').submit(function (event) {
  event.preventDefault();
  $.ajax({
    type: 'POST',
    url: '/login/multi-factor/check',
    data: {
      token: $(this).find('input[name="token"]').val(),
      code: $(this).find('input[name="code"]').val(),
      email: $(this).find('input[name="email"]').val(),
      type: $(this).find('input[name="type"]').val(),
    },
    success(response) {
      if (response.success) {
        // TODO: Re-enable when password policy confirmed
        // if (response.passwordExpired) {
        //   return postForm('/expired', { token: response.token }, 'GET');
        // }

        Cookies.set('curveToken', response.token, { secure: true });
        window.location.replace(window.location.origin);
      } else {
        $('#notification').html(`<div class="alert alert-info" role="alert"><h4 class="pull-left">Error Logging In</h4><br><p>${response.message}</p></div>`);
      }
    },
  });
});

// register form
$('#register-form').submit(function (event) {
  event.preventDefault();
  var formErrored = false;
  $('#notification').html('');

  // Check that the company name is set
  if (!$(this).find('input[name="clientName"]').val()) {
    $('#clientNameError').html('<b class="form-error">Required field.</b>');
    formErrored = true;
  } else {
    $('#clientNameError').html('');
  }
  // Check that the type is set
  if (!$(this).find('select[name="clientType"]').val()) {
    $('#clientTypeError').html('<b class="form-error">Required field.</b>');
    formErrored = true;
  } else {
    $('#clientTypeError').html('');
  }
  // Check that the billing is set
  if (!$(this).find('select[name="clientBilling"]').val()) {
    $('#clientBillingError').html('<b class="form-error">Required field.</b>');
    formErrored = true;
  } else {
    $('#clientBillingError').html('');
  }
  // Check that the email is set
  if (!$(this).find('input[name="email"]').val()) {
    $('#clientEmailError').html('<b class="form-error">Required field.</b>');
    formErrored = true;
  } else if (!/^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/.test($(this).find('input[name="email"]').val())) {
    $('#clientEmailError').html('<b class="form-error">Email format is invalid.</b>');
    formErrored = true;
  } else {
    $('#clientEmailError').html('');
  }
  // Check that the password is set
  if (!$(this).find('input[name="password"]').val()) {
    $('#clientPasswordError').html('<b class="form-error">Required field.</b>');
    formErrored = true;
  }
  // Check that the password is confirmed
  if (!$(this).find('input[name="confirmPassword"]').val()) {
    $('#clientConfirmPasswordError').html('<b class="form-error">Required field.</b>');
    formErrored = true;
  } else {
    $('#clientConfirmPasswordError').html('');
  }

  if (formErrored) {
    $('#notification').html('<div class="alert alert-danger" role="alert"><h4>Errors Completing Signup</h4></div>');
  } else {
    $.ajax({
      type: 'POST',
      url: '/signup/complete_signup',
      data: {
        clientName: $(this).find('input[name="clientName"]').val(),
        clientType: $(this).find('#clientType').val(),
        clientBilling: $(this).find('#clientBilling').val(),
        email: $(this).find('input[name="email"]').val(),
        marketingPermissions: $(this).find('#marketingPermissions').val(),
        password: $(this).find('input[name="password"]').val(),
        confirmPassword: $(this).find('input[name="confirmPassword"]').val(),
        grecaptcha: grecaptcha.getResponse(0),
      },
      success(response) {
        if (response.success) {
          $('#register-form').html('');
          $('#notification').html(`<div class="alert alert-success" role="alert"><p>${response.message}</p></div>`);
        } else {
          $('#notification').html(`<div class="alert alert-danger" role="alert"><h4 class="pull-left">Error Completing Signup</h4><br><p>${response.message}</p></div>`);
        }
      },
    });
  }
});

// send email
var resetForm = $('.reset-container');
var emailInput = resetForm.find('input[name="email"]');
var emailBtn = resetForm.find('button[type="submit"]');
var notificationWindow = $('.notification-container');
$('#reset-form').submit(function (event) {
  event.preventDefault();

  $.ajax({
    type: 'POST',
    url: '/reset/send_email',
    data: {
      email: emailInput.val(),
    },
    success(response) {
      resetForm.addClass('hidden');
      notificationWindow.removeClass('hidden');
    },
  });
});

$('#register-form').keyup(function (e) {
  if (e && e.target && e.target.id === 'password') {
    $('#clientPasswordError').html('');
    // get values
    const patternMinChars = /.{12,}/;
    const patternLowerCase = /^(?=.*[a-z]).*$/;
    const patternUpperCase = /^(?=.*[A-Z]).*$/;
    const patternNumbers = /^(?=.*\d).*$/;
    const patternSymbols = /^(?=.*\W+).*$/;

    $('#pass-error').show();

    checkpattern(patternMinChars, '#pass-error1');
    checkpattern(patternLowerCase, '#pass-error2');
    checkpattern(patternUpperCase, '#pass-error3');
    checkpattern(patternNumbers, '#pass-error4');
    checkpattern(patternSymbols, '#pass-error5');

    function checkpattern(pattern, id) {
      const pass = $('#password').val();
      if (!pattern.test(pass)) {
        $(id).removeClass('text-success');
        $(id).addClass('text-error');
        $('#submit').prop('disabled', true);
        formErrored = true;
      } else {
        $(id).removeClass('text-error');
        $(id).addClass('text-success');
        $('#submit').prop('disabled', false);
      }
    }
  }
});

// reset
const $resetForm = $('#reset-password');
$(document).ready(function () {
  $('#pass-error').hide();
  $('#save-password').prop('disabled', true); // disable reset form submit button on first load
});

$resetForm.submit(function (event) {
  const $emailInput = $resetForm.find('input[name="email"]');
  const token = window.location.search;
  event.preventDefault();
  $.ajax({
    type: 'POST',
    url: '/reset',
    data: {
      email: $emailInput.val(),
      password: $('#password').val(),
      confirm: $('#confirm').val(),
      token,
    },
    success(response) {
      if (response.success) {
        // Ensure cookie is not set during signup or reset so that the redirect will return to the login page
        Cookies.remove('curveToken');
        $('#notification').html('<div class=\'alert alert-info\' role=\'alert\'><h4 class=\'pull-left\'>Password successfully reset</h4><br><p>If you aren\'t redirected in two seconds, <a href=\'https://app.curveroyaltysystems.com\'>please click here to continue.</a></p></div>');
        window.location.replace(window.location.origin);
      } else {
        $('#notification').html(`<div class="alert alert-info" role="alert"><h4 class="pull-left">Reset Password Error</h4><br><p>${response.message}</p></div>`);
      }
    },
    error(response) {
      $('#notification').html('<div class="alert alert-info" role="alert"><h4 class="pull-left">Reset Password Error</h4><br><p>There was an error resetting your password. Please try again, or request a new password reset <a href="https://app.curveroyaltysystems.com/reset/send_email">here</a></p></div>');
    },
  });
});
$resetForm.keyup(function (e) {
  // get values
  const pass = $('#password').val();
  const confpass = $('#confirm').val();
  const pattern = /^(?=.*[a-z])(?=.*\d)(?=.*\W+)(?=.*[A-Z]).{12,}$/;
  const patternMinChars = /.{12,}/;
  const patternLowerCase = /^(?=.*[a-z]).*$/;
  const patternUpperCase = /^(?=.*[A-Z]).*$/;
  const patternNumbers = /^(?=.*\d).*$/;
  const patternSymbols = /^(?=.*\W+).*$/;
  $('#pass-error').show();

  checkpattern(patternMinChars, '#pass-error1');
  checkpattern(patternLowerCase, '#pass-error2');
  checkpattern(patternUpperCase, '#pass-error3');
  checkpattern(patternNumbers, '#pass-error4');
  checkpattern(patternSymbols, '#pass-error5');

  // check the strings
  if (pass == confpass && pattern.test(pass)) {
    // if both are same remove the error and allow to submit
    $('#confirm-error').removeClass('text-error');
    $('#confirm-error').addClass('text-success');
    $('#save-password').prop('disabled', false);
    // $('#pass-error').hide();
  } else {
    // if not matching show error and not allow to submit
    $('#confirm-error').addClass('text-error');
    $('#confirm-error').removeClass('text-success');
    $('#confirm-error').text('Must match the previous password');
    $('#save-password').prop('disabled', true);
  }
});
function checkpattern(pattern, id) {
  const pass = $('#password').val();
  if (!pattern.test(pass)) {
    $(id).removeClass('text-success');
    $(id).addClass('text-error');
    $('#save-password').prop('disabled', true);
  } else {
    $(id).removeClass('text-error');
    $(id).addClass('text-success');
    $('#save-password').prop('disabled', false);
  }
}

$('#confirm').keyup(function (e) {
  var pass = $('#password').val();
  var confpass = $('#confirm').val();
  // check the strings
  if (pass == confpass) {
    // if both are same remove the error and allow to submit
    $('#confirm-error').removeClass('text-error');
    $('#confirm-error').addClass('text-success');
    $('#save-password').prop('disabled', false);
    // $('#pass-error').hide();
  } else {
    // if not matching show error and not allow to submit
    $('#confirm-error').addClass('text-error');
    $('#confirm-error').removeClass('text-success');
    $('#confirm-error').text('Must match the previous password');
    $('#save-password').prop('disabled', true);
  }
});

function postForm(path, params, method) {
  method = method || 'post';

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    if (params.hasOwnProperty(key)) {
      var hiddenField = document.createElement('input');
      hiddenField.setAttribute('type', 'hidden');
      hiddenField.setAttribute('name', key);
      hiddenField.setAttribute('value', params[key]);

      form.appendChild(hiddenField);
    }
  }

  document.body.appendChild(form);
  form.submit();
}

// Expired Password
const $expiredForm = $('#expired-password');
$(document).ready(function () {
  $('#pass-error').hide();
  $('#expired-password-button').prop('disabled', true);
});

$expiredForm.submit((event) => {
  const currentPassword = $expiredForm.find('input[name="current-password"]').val();
  const newPassword = $expiredForm.find('input[name="new-password"]').val();
  const newPasswordRepeat = $expiredForm.find('input[name="new-password-repeat"]').val();
  const token = window.location.search;

  event.preventDefault();

  $.ajax({
    type: 'POST',
    url: '/expired',
    data: {
      currentPassword,
      newPassword,
      newPasswordRepeat,
      token,
    },
    success(response) {
      if (response.success) {
        // Redirect to the login page on success with message
        $('#notification').html('<div class=\'alert alert-info\' role=\'alert\'><h4 class=\'pull-left\'>Password successfully changed</h4><br><p>If you aren\'t redirected in two seconds, <a href=\'https://app.curveroyaltysystems.com\'>please click here to continue.</a></p></div>');
        window.location.replace(window.location.origin);
      } else {
        $('#notification').html(`<div class="alert alert-info" role="alert"><h4 class="pull-left">Update Password Error</h4><br><p>${response.message}</p></div>`);
      }
    },
    error(response) {
      $('#notification').html('<div class="alert alert-info" role="alert"><h4 class="pull-left">Update Password Error</h4><br><p>There was an error resetting your password. Please try again, or request a new password reset <a href="https://app.curveroyaltysystems.com/reset/send_email">here</a></p></div>');
    },
  });
});

const patterns = {
  pattern: /^(?=.*[a-z])(?=.*\d)(?=.*\W+)(?=.*[A-Z]).{12,}$/,
  patternMinChars: /.{12,}/,
  patternLowerCase: /^(?=.*[a-z]).*$/,
  patternUpperCase: /^(?=.*[A-Z]).*$/,
  patternNumbers: /^(?=.*\d).*$/,
  patternSymbols: /^(?=.*\W+).*$/,
};

const checkpatternExpired = (pattern, id) => {
  const pass = $('#new-password').val();
  $('#pass-error').show();

  const checkPassed = pattern.test(pass);
  $(id).toggleClass('text-success', checkPassed).toggleClass('text-error', !checkPassed);
  $('#expired-password-button').prop('disabled', !checkPassed);
  return checkPassed;
}

$expiredForm.keyup((e) => {
  const currentPassword = $('#current-password').val();
  const newPassword = $('#new-password').val();
  const newPasswordRepeat = $('#new-password-repeat').val();

  if (e?.target?.id === 'new-password') {
    const checksPassed = [
      checkpatternExpired(patterns.patternMinChars, '#pass-error1'),
      checkpatternExpired(patterns.patternLowerCase, '#pass-error2'),
      checkpatternExpired(patterns.patternUpperCase, '#pass-error3'),
      checkpatternExpired(patterns.patternNumbers, '#pass-error4'),
      checkpatternExpired(patterns.patternSymbols, '#pass-error5'),
    ];
    $('#pass-error').toggle(!checksPassed.every(Boolean));
  }

  const validPasswords = newPassword == newPasswordRepeat && patterns.pattern.test(newPassword);
  if (validPasswords) {
    $('#new-password-repeat-error').removeClass('text-error');
    $('#new-password-repeat-error').addClass('text-success');
    $('#new-password-repeat-error').hide();
  }

  if (!validPasswords) {
    $('#new-password-repeat-error').addClass('text-error');
    $('#new-password-repeat-error').removeClass('text-success');
    $('#new-password-repeat-error').text('Must match the previous password');
    $('#new-password-repeat-error').show();
  }

  $('#expired-password-button').prop('disabled', !(currentPassword && validPasswords));
});

// Multi Factor Setup form Submit
$('#mfa-form-setup').submit(function (event) {
  event.preventDefault();
  $.ajax({
    type: 'POST',
    url: '/login/multi-factor/setup/check',
    data: {
      token: $(this).find('input[id="token"]').val(),
      code: $(this).find('input[name="mfaCode"]').val(),
      email: $(this).find('input[id="email"]').val(),
      type: $(this).find('input[name="mfaType"]:checked').val(),
      qrCode: $(this).find('input[id="qrCode"]').val(),
    },
    success(response) {
      if (response.codeSent) {
        postForm('/login/multi-factor/setup', { token: response.token, qrCode: response.qrCode, email: response.email, codeSent: response.codeSent }, 'POST');
      } else if (response.success) {
        $('#notification').html('<div class=\'alert alert-info\' role=\'alert\'><h4 class=\'pull-left\'>MFA successfully setup</h4><br><p>If you aren\'t redirected in two seconds, <a href=\'https://app.curveroyaltysystems.com\'>please click here to continue.</a></p></div>');
        window.location.replace(window.location.origin);
      } else {
        $('#notification').html(`<div class="alert alert-info" role="alert"><h4 class="pull-left">Error during MFA Setup</h4><br><p>${response.message}</p></div>`);
      }
    },
    error(response) {
      $('#notification').html('<div class="alert alert-info" role="alert"><h4 class="pull-left">Update Password Error</h4><br><p>There was an error during the setup of MFA on your account. Please try again, or request a new password reset <a href="https://app.curveroyaltysystems.com/reset/send_email">here</a></p></div>');
    },
  });
});
