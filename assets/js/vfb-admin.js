/**
 * Visual Feedback - Admin Panel JS
 */
(function($) {
    'use strict';

    var api = vfbAdmin.restBase;
    var nonce = vfbAdmin.nonce;

    // Toggle session accordion
    window.vfbToggleSession = function(header) {
        var content = $(header).next('.vfb-session-content');
        var chevron = $(header).find('.vfb-chevron');

        content.slideToggle(200);
        chevron.toggleClass('open');
    };

    // Status change
    $(document).on('change', '.vfb-status-select', function() {
        var id = $(this).data('id');
        var status = $(this).val();
        var badge = $(this).closest('.vfb-annotation-item').find('.vfb-status-badge');

        $.ajax({
            url: api + '/annotations/' + id,
            method: 'PATCH',
            contentType: 'application/json',
            headers: { 'X-WP-Nonce': nonce },
            data: JSON.stringify({ status: status }),
            success: function(resp) {
                if (resp.success) {
                    badge.attr('class', 'vfb-status-badge vfb-status-' + status);
                    var labels = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved', wontfix: "Won't Fix" };
                    badge.text(labels[status] || status);
                }
            }
        });
    });

    // Save developer response
    $(document).on('click', '.vfb-save-response', function() {
        var id = $(this).data('id');
        var input = $('.vfb-response-input[data-id="' + id + '"]');
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
                    alert(vfbAdmin.i18n.saved);
                }
            }
        });
    });

    // Delete annotation
    $(document).on('click', '.vfb-delete-ann', function() {
        if (!confirm(vfbAdmin.i18n.confirmDelete)) return;

        var id = $(this).data('id');
        var item = $('#vfb-ann-' + id);

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
    $('#vfb-generate-api-key').on('click', function() {
        var btn = $(this);
        btn.prop('disabled', true).text('Generating...');

        $.ajax({
            url: vfbAdmin.ajaxUrl,
            method: 'POST',
            data: {
                action: 'vfb_generate_api_key',
                nonce: nonce
            },
            success: function(resp) {
                if (resp.success) {
                    var display = $('#vfb-api-key-display');
                    if (display.length) {
                        display.text(resp.data.key);
                    } else {
                        btn.before('<code id="vfb-api-key-display">' + resp.data.key + '</code> <button type="button" class="button" id="vfb-copy-api-key">Copy</button><br>');
                    }
                    btn.text('Regenerate API Key');
                }
                btn.prop('disabled', false);
            },
            error: function() {
                alert(vfbAdmin.i18n.error);
                btn.prop('disabled', false).text('Generate API Key');
            }
        });
    });

    // Copy API Key
    $(document).on('click', '#vfb-copy-api-key', function() {
        var key = $('#vfb-api-key-display').text();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(key).then(function() {
                alert(vfbAdmin.i18n.apiKeyCopied);
            });
        }
    });

})(jQuery);
