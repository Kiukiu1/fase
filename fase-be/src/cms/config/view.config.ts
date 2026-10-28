import { join } from 'path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import hbs from 'hbs';
import helpers from 'handlebars-helpers';
import { LeadStatus } from 'src/domain/enums';
import { STATUS_LABELS } from 'src/domain/lead/lead-status.rules';
import { PAGE_SIZE } from 'src/domain/paging';
import type { CmsRequest } from '../util/cms.helper';

const PAGES_SHOWN_EACH_SIDE = 3;
const VN_OFFSET = Number(process.env.BUSINESS_UTC_OFFSET_MINUTES ?? 420) * 60_000;

type BlockOptions = {
  fn: (context: unknown) => string;
  data: { root: { blocks?: Record<string, string> } };
};

/** Màu badge theo nhóm trạng thái. */
const STATUS_BADGE: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'secondary',
  [LeadStatus.ASSIGNED]: 'warning',
  [LeadStatus.RECEIVED]: 'info',
  [LeadStatus.NO_ANSWER_RETRY]: 'orange',
  [LeadStatus.NO_ANSWER_GIVE_UP]: 'dark',
  [LeadStatus.NO_NEED]: 'dark',
  [LeadStatus.NOT_FIT]: 'dark',
  [LeadStatus.CONTACTED]: 'info',
  [LeadStatus.NURTURING]: 'primary',
  [LeadStatus.DEMO_QUOTED]: 'purple',
  [LeadStatus.WON]: 'success',
  [LeadStatus.STOPPED]: 'danger',
  [LeadStatus.WRONG_NUMBER]: 'danger',
};

export function setupViews(app: NestExpressApplication) {
  const viewDirectory = join(__dirname, '..', 'view');

  app.engine('html', hbs.__express.bind(hbs));
  app.setBaseViewsDir(viewDirectory);
  app.setViewEngine('html');
  app.set('view options', { layout: 'template/default' });
  app.useStaticAssets(join(__dirname, '..', 'static', 'resources'), {
    prefix: '/cms/resources',
  });
  hbs.registerPartials(join(viewDirectory, 'template'));
  hbs.registerPartials(join(viewDirectory, 'fragment'));

  helpers({ handlebars: hbs.handlebars });
  registerLayoutHelpers();
  registerListHelpers();
  registerLeadHelpers();
  app.use('/cms', shareRequestWithViews);
}

function shareRequestWithViews(
  request: CmsRequest,
  response: { locals: Record<string, unknown> },
  next: () => void,
) {
  const [path, queryText] = request.originalUrl.split('?');
  const otherParams = new URLSearchParams(queryText);
  otherParams.delete('page');
  const otherQuery = otherParams.toString();

  response.locals.path = path;
  response.locals.pageBase = `${path}?${otherQuery}${otherQuery ? '&' : ''}`;
  response.locals.pageSize = PAGE_SIZE;
  response.locals.info = request.session.info;
  delete request.session.info;
  Object.defineProperty(response.locals, 'user', {
    enumerable: true,
    get: () => request.user,
  });
  Object.defineProperty(response.locals, 'unreadCount', {
    enumerable: true,
    get: () => request.unreadCount ?? 0,
  });
  next();
}

function registerLayoutHelpers() {
  hbs.registerHelper(
    'extend',
    function (this: unknown, name: string, options: BlockOptions) {
      const root = options.data.root;
      root.blocks = { ...root.blocks, [name]: options.fn(this) };
    },
  );
  hbs.registerHelper(
    'block',
    (name: string, options: BlockOptions) =>
      options.data.root.blocks?.[name] ?? '',
  );
}

function registerListHelpers() {
  hbs.registerHelper('pageNumbers', (page: number, total: number) => {
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const firstShown = Math.max(1, page - PAGES_SHOWN_EACH_SIDE);
    const lastShown = Math.min(lastPage, page + PAGES_SHOWN_EACH_SIDE);
    const numbers: { number: number; active: boolean }[] = [];
    for (let number = firstShown; number <= lastShown; number++) {
      numbers.push({ number, active: number === page });
    }
    return numbers;
  });
  hbs.registerHelper('rowIndex', (page: number, index: number) =>
    (page - 1) * PAGE_SIZE + index + 1,
  );
  hbs.registerHelper('json', (value: unknown) =>
    new hbs.handlebars.SafeString(
      JSON.stringify(value ?? null).replace(/</g, '\\u003c'),
    ),
  );
}

const pad = (value: number) => String(value).padStart(2, '0');
const toVn = (value: unknown) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return isNaN(date.getTime()) ? null : new Date(date.getTime() + VN_OFFSET);
};

function registerLeadHelpers() {
  hbs.registerHelper('statusLabel', (status: LeadStatus) => STATUS_LABELS[status] ?? status);
  hbs.registerHelper('statusBadge', (status: LeadStatus) => STATUS_BADGE[status] ?? 'secondary');
  /** Giờ Việt Nam bất kể TZ của server (container thường chạy UTC). */
  hbs.registerHelper('vnDateTime', (value: unknown) => {
    const local = toVn(value);
    return local
      ? `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())} ${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}`
      : '—';
  });
  /** Cột kiểu `date` (YYYY-MM-DD) -> dd/mm/yyyy */
  hbs.registerHelper('vnDate', (value: unknown) => {
    const text = typeof value === 'string' ? value : '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
  });
  hbs.registerHelper('countOf', (counts: Record<string, number>, key: string) => counts?.[key] ?? 0);
}
