import {
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { LeadImportBean, summarize } from 'src/domain/lead/import/lead-import.bean';
import { buildTemplate, ImportAction } from 'src/domain/lead/import/lead-import.parser';
import { PAGE_SIZE } from 'src/domain/paging';
import { CmsAction, CmsController, CmsView } from '../cms.decorator';
import type { CmsRequest } from '../util/cms.helper';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const RECENT_IMPORTS = 10;

@CmsController('cms/imports')
export class ImportController {
  constructor(private readonly importBean: LeadImportBean) {}

  @Get()
  @CmsView('import/form')
  async showForm(@Req() request: CmsRequest) {
    return { imports: await this.importBean.recent(request.user.id, RECENT_IMPORTS) };
  }

  @Get('template')
  async downloadTemplate(@Res() response: Response) {
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', 'attachment; filename="fase-lead-mau.xlsx"');
    response.send(await buildTemplate());
  }

  /** FR-CRM-01: upload -> trang xem trước. */
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  @CmsAction({ to: '/cms/imports' })
  async upload(@Req() request: CmsRequest, @UploadedFile() file?: Express.Multer.File) {
    const leadImport = await this.importBean.preview(request.user.id, file);
    const summary = summarize(leadImport.rows);
    return {
      message: `Đã đọc ${summary.total} dòng, vui lòng kiểm tra trước khi xác nhận`,
      to: `/cms/imports/${leadImport.id}`,
    };
  }

  @Get(':id')
  @CmsView('import/preview')
  async preview(
    @Req() request: CmsRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query('action') actionParam: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) pageParam: number,
  ) {
    const leadImport = await this.importBean.findPreview(request.user.id, id);
    const action = Object.values(ImportAction).find((value) => value === actionParam);
    const rows = action
      ? leadImport.rows.filter((row) => row.action === action)
      : leadImport.rows;
    const page = Math.max(1, pageParam);
    return {
      leadImport,
      summary: summarize(leadImport.rows),
      action,
      rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      total: rows.length,
      page,
    };
  }

  @Post(':id/confirm')
  @CmsAction({ to: '/cms/leads?scope=POOL', onError: '/cms/imports/:id' })
  async confirm(@Req() request: CmsRequest, @Param('id', ParseIntPipe) id: number) {
    const result = await this.importBean.confirm(request.user.id, id);
    return `Import xong: thêm mới ${result.createdCount} LEAD, ghi đè ${result.overwrittenCount} LEAD`;
  }
}
