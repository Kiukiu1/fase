$(function () {
    var $checks = $('.row-check:not(:disabled)');
    var $bar = $('#selectionBar');

    function selectedRows() {
        return $checks.filter(':checked').closest('tr');
    }

    function selectedIds() {
        return $checks.filter(':checked').map(function () { return this.value; }).get();
    }

    function refresh() {
        var $rows = selectedRows();
        var count = $rows.length;
        $bar.prop('hidden', count === 0);
        $('#selectedCount, .js-selected-count').text(count);
        $('#revokeBtn').prop('disabled', $rows.filter('[data-revocable="false"]').length > 0);
        $('#reopenBtn').prop('disabled', $rows.filter('[data-reopenable="false"]').length > 0);
        // Có LEAD không nằm trong kho -> bắt buộc tick "cho phép phân lại"
        var needReassign = $rows.filter('[data-pool="false"]').length > 0;
        $('#reassign').prop('checked', needReassign || $('#reassign').prop('checked'));
        $('#checkAll').prop('checked', count > 0 && count === $checks.length);
        refreshAssign();
    }

    $checks.on('change', refresh);
    $('#checkAll').on('change', function () {
        $checks.prop('checked', this.checked);
        refresh();
    });
    $('#clearSelection').on('click', function () {
        $checks.prop('checked', false);
        refresh();
    });

    $('[data-bulk-action]').on('click', function () {
        openConfirm($(this).data('bulk-action'), $(this).data('confirm-title'), selectedIds().length + ' LEAD', selectedIds());
    });

    // ----- Modal phân LEAD -----
    function mode() {
        return $('#assignForm input[name="mode"]:checked').val();
    }

    function refreshAssign() {
        var total = selectedIds().length;
        var $picked = $('.js-sales:checked');
        var manual = mode() === 'MANUAL';
        $('#modeHint').text(manual
            ? 'Nhập số LEAD cho từng nhân viên, tổng phải bằng số LEAD đã chọn.'
            : 'Chọn nhân viên, hệ thống chia lần lượt cho từng người.');
        $('#manualTotal').prop('hidden', !manual);
        var sum = 0;
        $('.js-sales').each(function (index) {
            var $item = $(this).closest('.list-group-item');
            var $count = $item.find('.js-count');
            var picked = this.checked;
            $count.prop('hidden', !manual || !picked).prop('disabled', !manual || !picked);
            if (manual && picked) sum += Number($count.val() || 0);
            var share = '';
            if (!manual && picked && $picked.length) {
                var position = $picked.index(this);
                share = Math.floor(total / $picked.length) + (position < total % $picked.length ? 1 : 0) + ' LEAD';
            }
            $item.find('.js-even-share').text(share);
        });
        $('#manualSum').text(sum).toggleClass('text-danger', manual && sum !== total);
        var ok = total > 0 && $picked.length > 0 && (!manual || sum === total);
        $('#assignSubmit').prop('disabled', !ok);
    }

    $('#assignForm').on('change input', 'input', refreshAssign);
    $('#assignModal').on('show.bs.modal', refreshAssign);
    $('#assignForm').on('submit', function () {
        var $inputs = $('#assignLeadInputs').empty();
        selectedIds().forEach(function (id) {
            $('<input type="hidden" name="leadIds[]">').val(id).appendTo($inputs);
        });
    });

    refresh();
});
