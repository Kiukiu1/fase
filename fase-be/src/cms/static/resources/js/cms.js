$(function () {
    // Nút xác nhận (thu hồi / mở lại một LEAD): data-confirm-action + data-ids
    $(document).on('click', '[data-confirm-action]', function () {
        var d = $(this).data();
        openConfirm(d.confirmAction, d.confirmTitle, d.confirmName, String(d.ids || '').split(',').filter(Boolean));
    });

    $('[title]').tooltip({ trigger: 'hover' });

    $('.custom-file-input').on('change', function () {
        var name = this.files && this.files[0] ? this.files[0].name : 'Chọn file .xlsx…';
        $(this).next('.custom-file-label').text(name);
    });

    var $info = $('#info');
    if ($info.length) {
        $(document).Toasts('create', {
            class: $info.data('type') === 'success' ? 'toast-success' : 'toast-error',
            body: '<i class="fas ' + ($info.data('type') === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle') + '"></i><span>' +
                $('<div>').text($info.attr('data-content')).html() + '</span>',
            position: 'topRight',
            close: false,
            autohide: true,
            delay: 6000
        });
    }
});

function openConfirm(action, title, name, ids) {
    var $inputs = $('#confirmInputs').empty();
    $('<input type="hidden" name="returnTo">').val(location.pathname + location.search).appendTo($inputs);
    (ids || []).forEach(function (id) {
        $('<input type="hidden" name="leadIds[]">').val(id).appendTo($inputs);
    });
    $('#confirmForm').attr('action', action);
    $('#confirmTitle').text(title || 'Bạn có chắc chắn không?');
    $('#confirmName').text(name || '');
    $('#confirmModal').modal('show');
}
