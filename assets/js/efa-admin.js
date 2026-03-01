/**
 * Eye for AI - Admin Panel JS
 */
(function($) {
    'use strict';

    var api = efaAdmin.restBase;
    var nonce = efaAdmin.nonce;

    // Toggle session accordion
    window.efaToggleSession = function(header) {
        var content = $(header).next('.efa-session-content');
        var chevron = $(header).find('.efa-chevron');

        content.slideToggle(200);
        chevron.toggleClass('open');
    };

    // Status change
    $(document).on('change', '.efa-status-select', function() {
        var id = $(this).data('id');
        var status = $(this).val();
        var badge = $(this).closest('.efa-annotation-item').find('.efa-status-badge');

        $.ajax({
            url: api + '/annotations/' + id,
            method: 'PATCH',
            contentType: 'application/json',
            headers: { 'X-WP-Nonce': nonce },
            data: JSON.stringify({ status: status }),
            success: function(resp) {
                if (resp.success) {
                    badge.attr('class', 'efa-status-badge efa-status-' + status);
                    var labels = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved', wontfix: "Won't Fix" };
                    badge.text(labels[status] || status);
                }
            }
        });
    });

    // Save developer response
    $(document).on('click', '.efa-save-response', function() {
        var id = $(this).data('id');
        var input = $('.efa-response-input[data-id="' + id + '"]');
        var response = input.val().trim();

        if (!response) return;

        $.ajax({
            url: api + '/annotations/' + id,
            method: 'PATCH',
            contentType: 'application/json',
            headers: { 'X-WP-Nonce': nonce },
            data: JSON.stringify({ developer_response: response }),
            success: function(resp) {
                if (resp.success) {
                    alert(efaAdmin.i18n.saved);
                }
            }
        });
    });

    // Delete annotation
    $(document).on('click', '.efa-delete-ann', function() {
        if (!confirm(efaAdmin.i18n.confirmDelete)) return;

        var id = $(this).data('id');
        var item = $('#efa-ann-' + id);

        $.ajax({
            url: api + '/annotations/' + id,
            method: 'DELETE',
            headers: { 'X-WP-Nonce': nonce },
            success: function(resp) {
                if (resp.success) {
                    item.fadeOut(300, function() { $(this).remove(); });
                }
            }
        });
    });

    // Generate API Key
    $('#efa-generate-api-key').on('click', function() {
        var btn = $(this);
        btn.prop('disabled', true).text('Generating...');

        $.ajax({
            url: efaAdmin.ajaxUrl,
            method: 'POST',
            data: {
                action: 'efa_generate_api_key',
                nonce: nonce
            },
            success: function(resp) {
                if (resp.success) {
                    var display = $('#efa-api-key-display');
                    if (display.length) {
                        display.text(resp.data.key);
                    } else {
                        btn.before('<code id="efa-api-key-display">' + resp.data.key + '</code> <button type="button" class="button" id="efa-copy-api-key">Copy</button><br>');
                    }
                    btn.text('Regenerate API Key');
                }
                btn.prop('disabled', false);
            },
            error: function() {
                alert(efaAdmin.i18n.error);
                btn.prop('disabled', false).text('Generate API Key');
            }
        });
    });

    // Copy API Key
    $(document).on('click', '#efa-copy-api-key', function() {
        var key = $('#efa-api-key-display').text();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(key).then(function() {
                alert(efaAdmin.i18n.apiKeyCopied);
            });
        }
    });

})(jQuery);
