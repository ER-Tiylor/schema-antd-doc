/**
 * BizSelect 全场景对照。
 *
 * 按 API 顺序逐条落地：标量直用 → schema 配置 → 表格行内 → 对象值 →
 * 辅助能力 → 内联源。基础用法页讲「怎么用」，这一页讲「每种写法长什么样、边界在哪」。
 */
import type { ReactNode } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert, Button, Card, Col, Divider, Form, Row, Space, Tag, Typography } from 'antd';

import { EditableTable, SchemaForm } from '@tianyr/schema-antd';
import {
  BizSelect,
  BizSelectDisplay,
  defineSelectSources,
  invalidateSelectSource,
  loaded,
  registerBizSelectField,
  remote,
  staticList,
  useCandidates,
} from '@tianyr/schema-antd/biz-select';
import type { AnyFormFieldSchema, EditableColumn, FormFieldSchema } from '@tianyr/schema-antd';
import type {
  BizOption,
  BizSelectProps,
  BizSelectSchemaProps,
  SelectValue,
} from '@tianyr/schema-antd/biz-select';

// ---------------------------------------------------------------------------
// 数据源：模块级注册一次，命名加 preview- 前缀避免与 ⑧ 的 demo-biz- 冲突
// ---------------------------------------------------------------------------

const PROVINCES: BizOption[] = [
  { value: 'zj', label: '浙江' },
  { value: 'js', label: '江苏' },
  { value: 'gd', label: '广东' },
];

const CITIES: Record<string, BizOption[]> = {
  zj: [
    { value: 'hz', label: '杭州' },
    { value: 'nb', label: '宁波' },
  ],
  js: [
    { value: 'nj', label: '南京' },
    { value: 'sz', label: '苏州' },
  ],
  gd: [
    { value: 'gz', label: '广州' },
    { value: 'sz-gd', label: '深圳' },
  ],
};

const DISTRICTS: Record<string, BizOption[]> = {
  hz: [
    { value: 'xh', label: '西湖区' },
    { value: 'yh', label: '余杭区' },
  ],
  nb: [{ value: 'hs', label: '海曙区' }],
  nj: [{ value: 'gl', label: '鼓楼区' }],
  sz: [{ value: 'gs', label: '姑苏区' }],
  gz: [{ value: 'th', label: '天河区' }],
  'sz-gd': [{ value: 'ft', label: '福田区' }],
};

const WAREHOUSES: BizOption[] = [
  { value: 'wh1', label: '杭州仓' },
  { value: 'wh2', label: '苏州仓' },
];

const CURRENCIES: BizOption[] = [
  { value: 'CNY', label: '人民币' },
  { value: 'USD', label: '美元' },
  { value: 'EUR', label: '欧元' },
];

interface MaterialRecord {
  code: string;
  name: string;
  warehouseCode: string;
}

const MATERIALS: MaterialRecord[] = [
  { code: 'm1', name: '螺丝 M6', warehouseCode: 'wh1' },
  { code: 'm2', name: '垫片 4mm', warehouseCode: 'wh1' },
  { code: 'm3', name: '弹簧 2mm', warehouseCode: 'wh2' },
  { code: 'm4', name: '轴承 6204', warehouseCode: 'wh2' },
];

// 接口平铺 userId / userName：前端对象值只认这两个键，下游靠 pick 取 userId
interface UserRecord {
  userId: string;
  userName: string;
}

const USERS: UserRecord[] = [
  { userId: 'u1', userName: '张三' },
  { userId: 'u2', userName: '李四' },
];

/** 用户下的账户：父字段是对象时，参数靠 paramsFrom 的 pick 取 userId */
const ACCOUNTS: Record<string, BizOption[]> = {
  u1: [{ value: 'a1', label: '张三-基本户' }],
  u2: [{ value: 'a2', label: '李四-一般户' }],
};

/**
 * 失效重取演示用：每次真正取数都 +1。
 * 计数放在模块级并对外订阅，页面才能看到「没有重新挂载也重取了」。
 */
let refreshableLoads = 0;
const refreshableListeners = new Set<() => void>();

function bumpRefreshableLoads() {
  refreshableLoads += 1;
  refreshableListeners.forEach((listener) => listener());
}

function subscribeRefreshableLoads(listener: () => void) {
  refreshableListeners.add(listener);
  return () => {
    refreshableListeners.delete(listener);
  };
}

defineSelectSources({
  // ① 静态：完全在前端
  'preview-province': staticList(PROVINCES),
  'preview-warehouse': staticList(WAREHOUSES),

  // ② 有限远程枚举：一次拉全量，之后前端过滤
  'preview-currency': loaded(async () => CURRENCIES),
  'preview-currency-refreshable': loaded(async () => {
    bumpRefreshableLoads();
    return CURRENCIES;
  }),
  'preview-user': staticList(USERS, { value: 'userId', label: 'userName' }),
  'preview-user-account': loaded(async (params) => ACCOUNTS[String(params.userId ?? '')] ?? [], {
    requiredParams: ['userId'],
  }),
  'preview-city': loaded(async (params) => CITIES[String(params.provinceCode ?? '')] ?? []),
  'preview-district': loaded(async (params) => DISTRICTS[String(params.cityCode ?? '')] ?? []),

  // ③ 无限远程：关键词搜索 + 按编码精确回显
  'preview-material': remote({
    // 物料按仓库隔离：没有仓库就不查，避免拿到别的仓的物料
    requiredParams: ['warehouseCode'],
    // 后端记录是 { code, name }：在源这里映射一次，下游只认 { value, label }
    recordFields: { value: 'code', label: 'name' },
    search: async (keyword, params) => {
      const warehouseCode = String(params.warehouseCode ?? '');
      return MATERIALS.filter(
        (item) => item.warehouseCode === warehouseCode && item.name.includes(keyword),
      );
    },
    resolve: async (value, params) => {
      const found = MATERIALS.find((item) => item.code === value);
      if (!found || found.warehouseCode !== String(params.warehouseCode ?? '')) return null;
      return found;
    },
    namespace: () => 'schemaDemo',
  }),
});

// 字段类型必须显式注册，包默认只提供标准 antd 控件
registerBizSelectField();

/** 内联源要跨实例共享缓存，只能传模块级 / 导入的函数 */
async function fetchCurrencyInline(): Promise<BizOption[]> {
  return CURRENCIES;
}

/** BizSelect 的 schema 专有属性不在通用字段类型里，这里收窄成表格列能吃的形态 */
function bizField(schema: FormFieldSchema & BizSelectSchemaProps): AnyFormFieldSchema {
  return schema as unknown as AnyFormFieldSchema;
}

// ---------------------------------------------------------------------------
// 页面骨架
// ---------------------------------------------------------------------------

function Section(props: { title: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Typography.Text strong>{props.title}</Typography.Text>
      {props.desc ? (
        <Typography.Paragraph type="secondary" style={{ margin: '4px 0 12px' }}>
          {props.desc}
        </Typography.Paragraph>
      ) : null}
      {props.children}
    </Card>
  );
}

function Item(props: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ marginBottom: 4 }}>
        <Typography.Text>{props.label}</Typography.Text>
        {props.hint ? (
          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
            {props.hint}
          </Typography.Text>
        ) : null}
      </div>
      {props.children}
    </div>
  );
}

/**
 * 无受控需求的示例统一用它：只管一个标量编码。
 * Omit 作用在联合类型上会塌掉判别式，所以先 Extract 出标量分支再省掉受控键。
 */
type LooseSelectProps = Omit<Extract<BizSelectProps, { valueMode?: 'primitive' }>, 'value' | 'onChange'>;

function LooseSelect(props: LooseSelectProps) {
  const [value, setValue] = useState<SelectValue>();
  return <BizSelect {...props} value={value} onChange={(next) => setValue(next)} />;
}

// ---------------------------------------------------------------------------
// 一、标量值：直接使用
// ---------------------------------------------------------------------------

function ScalarDirect() {
  const [provinceCode, setProvinceCode] = useState<string>('zj');
  const [cityCode, setCityCode] = useState<string>();
  const [warehouseCode, setWarehouseCode] = useState<string>('wh1');
  const [materialCode, setMaterialCode] = useState<string>('m1');

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Row gutter={24}>
        <Col span={8}>
          <Item label="最简：静态枚举" hint="没有请求，也没有 loading">
            <LooseSelect source="preview-province" style={{ width: '100%' }} />
          </Item>
        </Col>
        <Col span={8}>
          <Item label="有限远程枚举" hint="展开时拉一次全量，之后前端过滤">
            <LooseSelect source="preview-currency" style={{ width: '100%' }} />
          </Item>
        </Col>
        <Col span={8}>
          <Item label="无限远程" hint="输入才搜；只有编码时先显示编码">
            <LooseSelect
              source="preview-material"
              params={{ warehouseCode }}
              style={{ width: '100%' }}
            />
          </Item>
        </Col>
      </Row>

      <Divider style={{ margin: '4px 0 12px' }} />

      <Item label="级联" hint="省份一变，城市候选立即失效">
        <Space>
          <BizSelect
            source="preview-province"
            value={provinceCode}
            onChange={(next) => {
              setProvinceCode(String(next ?? ''));
              setCityCode(undefined);
            }}
            style={{ width: 160 }}
          />
          <BizSelect
            source="preview-city"
            params={{ provinceCode }}
            value={cityCode}
            onChange={(next) => setCityCode(next as string | undefined)}
            style={{ width: 160 }}
          />
        </Space>
      </Item>

      <Item
        label="门禁"
        hint="preview-material 声明了 requiredParams: ['warehouseCode']，仓库为空时不发请求"
      >
        <Space wrap>
          <BizSelect
            source="preview-warehouse"
            value={warehouseCode}
            onChange={(next) => setWarehouseCode(String(next ?? ''))}
            allowClear
            style={{ width: 160 }}
          />
          <BizSelect
            source="preview-material"
            params={{ warehouseCode }}
            value={materialCode}
            onChange={(next) => setMaterialCode(next as string)}
            style={{ width: 200 }}
          />
          <Typography.Text type="secondary">当前物料：{materialCode || '未选'}</Typography.Text>
        </Space>
      </Item>

      <Item label="展示模式与搜索字段" hint="V-L 用 - 连接，缺一侧自动降级">
        <Space wrap>
          <BizSelect source="preview-province" displayMode="V" value="zj" style={{ width: 110 }} />
          <BizSelect
            source="preview-province"
            displayMode="V-L"
            value="zj"
            style={{ width: 150 }}
          />
          <BizSelect source="preview-province" displayMode="L" value="zj" style={{ width: 110 }} />
          <LooseSelect
            source="preview-province"
            searchFields="value"
            placeholder="只按编码搜"
            style={{ width: 160 }}
          />
        </Space>
      </Item>

      <Item
        label="详情先带回名称（seedOptions）"
        hint="命中预置候选就不再发 resolve，编码 m999 在数据源里查不到"
      >
        <BizSelect
          source="preview-material"
          params={{ warehouseCode }}
          seedOptions={[{ value: 'm999', label: '接口带回的物料名' }]}
          value="m999"
          style={{ width: 220 }}
        />
      </Item>
    </Space>
  );
}

// ---------------------------------------------------------------------------
// 二、标量值：schema 配置
// ---------------------------------------------------------------------------

const SCALAR_SCHEMA: (FormFieldSchema & BizSelectSchemaProps)[] = [
  // 最简
  { type: 'BizSelect', name: 'provinceCode', label: '省份', source: 'preview-province' },
  // 远程只是换个源名
  { type: 'BizSelect', name: 'currencyCode', label: '币种', source: 'preview-currency' },
  // 级联：参数名 ← 字段名
  {
    type: 'BizSelect',
    name: 'cityCode',
    label: '城市',
    source: 'preview-city',
    paramsFrom: { provinceCode: 'provinceCode' },
  },
  // 多级链：逐级清空，不需要额外配置
  {
    type: 'BizSelect',
    name: 'districtCode',
    label: '区县',
    source: 'preview-district',
    paramsFrom: { provinceCode: 'provinceCode', cityCode: 'cityCode' },
  },
  { type: 'BizSelect', name: 'warehouseCode', label: '仓库', source: 'preview-warehouse' },
  // 门禁 + 自定义提示
  {
    type: 'BizSelect',
    name: 'materialCode',
    label: '物料',
    source: 'preview-material',
    paramsFrom: { warehouseCode: 'warehouseCode' },
    blockedText: '请先选择仓库',
  },
  // 快照语义：父变了也保留已选值
  {
    type: 'BizSelect',
    name: 'materialSnapshotCode',
    label: '物料（快照）',
    source: 'preview-material',
    paramsFrom: { warehouseCode: 'warehouseCode' },
    clearOnParent: false,
  },
  // 改展示 / 搜索
  {
    type: 'BizSelect',
    name: 'provinceVL',
    label: '省份（V-L）',
    source: 'preview-province',
    displayMode: 'V-L',
    searchFields: 'both',
  },
];

function SchemaScalar() {
  const [form] = Form.useForm();
  const [readOnly, setReadOnly] = useState(false);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <SchemaForm
        form={form}
        schema={SCALAR_SCHEMA}
        columns={2}
        mode={readOnly ? 'read' : 'edit'}
        initialValues={{
          provinceCode: 'zj',
          currencyCode: 'CNY',
          cityCode: 'hz',
          districtCode: 'xh',
          warehouseCode: 'wh1',
          materialCode: 'm1',
          materialSnapshotCode: 'm1',
        }}
      />
      <Space wrap>
        <Button size="small" onClick={() => setReadOnly((value) => !value)}>
          {readOnly ? '切到编辑态' : '切到只读态'}
        </Button>
        <Button size="small" onClick={() => form.setFieldsValue({ warehouseCode: 'wh2' })}>
          把仓库改成苏州仓
        </Button>
        <Button size="small" onClick={() => form.setFieldsValue({ provinceCode: 'js' })}>
          把省份改成江苏
        </Button>
        <Typography.Text type="secondary">
          「物料」会被清空；「物料（快照）」保留原值，但换了仓库后名称可能解析不到，会降级显示编码
        </Typography.Text>
      </Space>
    </Space>
  );
}

// ---------------------------------------------------------------------------
// 三、表格行内
// ---------------------------------------------------------------------------

interface TableRow {
  id: string;
  warehouseCode?: string;
  materialCode?: string;
}

const INITIAL_ROWS: TableRow[] = [
  { id: 'r1', warehouseCode: 'wh1', materialCode: 'm1' },
  { id: 'r2', warehouseCode: 'wh2', materialCode: 'm3' },
];

function TableRowDemo() {
  const [rows, setRows] = useState<TableRow[]>(() => INITIAL_ROWS.map((row) => ({ ...row })));

  const columns: EditableColumn<TableRow>[] = [
    {
      title: '仓库',
      dataIndex: 'warehouseCode',
      width: 180,
      editable: true,
      field: bizField({ type: 'BizSelect', name: 'warehouseCode', source: 'preview-warehouse' }),
    },
    {
      title: '物料',
      dataIndex: 'materialCode',
      width: 240,
      editable: true,
      // ctx.get 在本行 Form 里解析，所以声明与表单里完全一样
      field: bizField({
        type: 'BizSelect',
        name: 'materialCode',
        source: 'preview-material',
        paramsFrom: { warehouseCode: 'warehouseCode' },
        blockedText: '请先选择仓库',
      }),
    },
  ];

  return (
    <EditableTable<TableRow>
      rowKey="id"
      columns={columns}
      dataSource={rows}
      onSave={(nextRow) => {
        setRows((prev) => prev.map((row) => (row.id === nextRow.id ? nextRow : row)));
      }}
      onDelete={(row) => setRows((prev) => prev.filter((item) => item.id !== row.id))}
    />
  );
}

// ---------------------------------------------------------------------------
// 四、对象值
// ---------------------------------------------------------------------------

type ObjectValue = Record<string, unknown>;

function ObjectValues() {
  const [legacy, setLegacy] = useState<ObjectValue>({ value: 'm1', label: '螺丝 M6' });
  const [cn, setCn] = useState<ObjectValue>({ value: 'm1', label: '螺丝 M6' });
  const [cascade, setCascade] = useState<ObjectValue>();
  const [warehouseCode, setWarehouseCode] = useState('wh1');
  const [form] = Form.useForm();
  const [submitted, setSubmitted] = useState('');

  const submit = () => {
    const { material } = form.getFieldsValue() as { material?: ObjectValue };
    // 提交：对象拆成两列
    const payload = { materialCode: material?.value, materialName: material?.label };
    setSubmitted(JSON.stringify(payload));
  };

  const echo = () => {
    // 回显：两列合成一个对象，直接展示，不再发 resolve
    form.setFieldsValue({ material: { value: 'm3', label: '接口带回的弹簧 2mm' } });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Row gutter={24}>
        <Col span={8}>
          <Item label="最简" hint="值是 { value, label }，即存量 searchInputValue 形态">
            <BizSelect
              source="preview-material"
              params={{ warehouseCode }}
              valueMode="object"
              value={legacy}
              onChange={(next) => setLegacy(next ?? {})}
              style={{ width: '100%' }}
            />
          </Item>
        </Col>
        <Col span={8}>
          <Item label="后端就是 { code, name }" hint="valueFields 只做键名映射，不改结构">
            <BizSelect
              source="preview-material"
              params={{ warehouseCode }}
              valueMode="object"
              valueFields={{ value: 'code', label: 'name' }}
              value={cn}
              onChange={(next) => setCn(next ?? {})}
              style={{ width: '100%' }}
            />
          </Item>
        </Col>
        <Col span={8}>
          <Item label="级联 + 对象" hint="名称随值存取，切换仓库不再需要 resolve">
            <BizSelect
              source="preview-material"
              params={{ warehouseCode }}
              valueMode="object"
              value={cascade}
              onChange={(next) => setCascade(next ?? {})}
              style={{ width: '100%' }}
            />
          </Item>
        </Col>
      </Row>

      <Divider style={{ margin: '4px 0 12px' }} />

      <Item label="完整闭环：提交拆分 / 回显合成">
        <Form form={form} layout="inline" initialValues={{ material: { value: 'm1', label: '螺丝 M6' } }}>
          <Form.Item name="material" label="物料">
            <BizSelect
              source="preview-material"
              params={{ warehouseCode }}
              valueMode="object"
              style={{ width: 240 }}
            />
          </Form.Item>
        </Form>
        <Space style={{ marginTop: 8 }}>
          <Button size="small" onClick={submit}>
            提交
          </Button>
          <Button size="small" onClick={echo}>
            用接口数据回显
          </Button>
          {submitted ? <Typography.Text code>{submitted}</Typography.Text> : null}
        </Space>
      </Item>

      <Item
        label="切父级"
        hint="这里没配联动：切仓库不会自动清掉已选物料（标量值也一样）。要清空得在 onChange 里自己处理"
      >
        <Space>
          <BizSelect
            source="preview-warehouse"
            value={warehouseCode}
            onChange={(next) => setWarehouseCode(String(next ?? ''))}
            style={{ width: 160 }}
          />
        </Space>
      </Item>
    </Space>
  );
}

const OBJECT_SCHEMA: (FormFieldSchema & BizSelectSchemaProps)[] = [
  { type: 'BizSelect', name: 'warehouseCode', label: '仓库', source: 'preview-warehouse' },
  {
    type: 'BizSelect',
    name: 'material',
    label: '物料（{ value, label }）',
    source: 'preview-material',
    valueMode: 'object',
    paramsFrom: { warehouseCode: 'warehouseCode' },
  },
  {
    type: 'BizSelect',
    name: 'materialCN',
    label: '物料（{ code, name }）',
    source: 'preview-material',
    valueMode: 'object',
    valueFields: { value: 'code', label: 'name' },
    paramsFrom: { warehouseCode: 'warehouseCode' },
  },
  // 父字段存的是对象，下游只要对象里的 userId：用 pick 声明，别把整个对象当参数
  {
    type: 'BizSelect',
    name: 'owner',
    label: '经办人（对象值）',
    source: 'preview-user',
    valueMode: 'object',
    valueFields: { value: 'userId', label: 'userName' },
  },
  {
    type: 'BizSelect',
    name: 'ownerAccount',
    label: '账户（依赖 owner.userId）',
    source: 'preview-user-account',
    paramsFrom: { userId: { from: 'owner', pick: 'userId' } },
    blockedText: '请先选择经办人',
  },
];

function SchemaObject() {
  return (
    <SchemaForm
      schema={OBJECT_SCHEMA}
      columns={2}
      initialValues={{
        warehouseCode: 'wh1',
        material: { value: 'm1', label: '螺丝 M6' },
        materialCN: { value: 'm1', label: '螺丝 M6' },
        owner: { userId: 'u1', userName: '张三' },
        ownerAccount: 'a1',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 五、辅助能力
// ---------------------------------------------------------------------------

function InvalidateDemo() {
  const loads = useSyncExternalStore(
    subscribeRefreshableLoads,
    () => refreshableLoads,
    () => 0,
  );

  return (
    <Space wrap>
      {/* 故意不给 key：要看的正是「不重新挂载也能重取」 */}
      <BizSelect source="preview-currency-refreshable" placeholder="币种" style={{ width: 180 }} />
      <Button
        size="small"
        onClick={() => invalidateSelectSource('preview-currency-refreshable')}
      >
        失效重取
      </Button>
      <Typography.Text type="secondary">
        已取数 {loads} 次。先展开一次下拉，再点「失效重取」：实例自己换 key 重取，不重新挂载
      </Typography.Text>
    </Space>
  );
}

/** 同一份候选给别的 UI 用：这里不挂 Select，只拿数据 */
function CandidatesPeek() {
  const [provinceCode, setProvinceCode] = useState('zj');
  // 直接传注册名：来源解析和来源键（含版本订阅）都在 Hook 里，
  // 和组件用的是同一个身份，不会各算一套导致缓存分叉
  const { sourceKey, options, loading, open } = useCandidates({
    source: 'preview-city',
    params: { provinceCode },
    searchFields: 'both',
  });

  // load 型不会在挂载时取数，这里代表「用户主动要看列表」
  useEffect(() => {
    open();
  }, [open, sourceKey]);

  return (
    <Space wrap>
      <BizSelect
        source="preview-province"
        value={provinceCode}
        onChange={(next) => setProvinceCode(String(next ?? ''))}
        style={{ width: 160 }}
      />
      {loading ? <Tag>加载中</Tag> : null}
      {options.map((item) => (
        <Tag key={String(item.value)}>{item.label}</Tag>
      ))}
    </Space>
  );
}

function DisplayDemo() {
  const [warehouseCode, setWarehouseCode] = useState('wh1');

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Item label="单独使用" hint="不在表单里，只要一个编码也能解析名称">
        <Space>
          <BizSelectDisplay source="preview-material" params={{ warehouseCode }} value="m1" />
          <Divider type="vertical" />
          <BizSelectDisplay source="preview-province" value="zj" displayMode="V-L" />
        </Space>
      </Item>
      <Item
        label="解析不到时"
        hint="显示原始编码，title 说明原因，绝不把编码伪装成名称"
      >
        <Space>
          <BizSelectDisplay source="preview-material" params={{}} value="m1" />
          <Divider type="vertical" />
          <BizSelectDisplay source="preview-material" params={{ warehouseCode }} value="m999" />
        </Space>
      </Item>
      <Item label="在表单里" hint="mode='read' 自动走同一套解析，不用管">
        <Space>
          <BizSelect
            source="preview-warehouse"
            value={warehouseCode}
            onChange={(next) => setWarehouseCode(String(next ?? ''))}
            style={{ width: 160 }}
          />
          <Typography.Text type="secondary">只读：</Typography.Text>
          <BizSelectDisplay source="preview-warehouse" value={warehouseCode} />
        </Space>
      </Item>
    </Space>
  );
}

// ---------------------------------------------------------------------------
// 六、内联源
// ---------------------------------------------------------------------------

function InlineDemo() {
  const [tick, setTick] = useState(0);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Item label="纯数据内联" hint="按内容哈希做来源键，跨实例共享缓存">
        <Space wrap>
          <BizSelect source={{ options: PROVINCES }} placeholder="省份" style={{ width: 160 }} />
          <BizSelect source={{ options: PROVINCES }} placeholder="同一个源的第二个实例" style={{ width: 200 }} />
        </Space>
      </Item>

      <Item label="传模块级函数" hint="函数引用稳定，跨实例共享缓存">
        <Space wrap>
          <BizSelect source={{ load: fetchCurrencyInline }} placeholder="币种" style={{ width: 160 }} />
          <BizSelect source={{ load: fetchCurrencyInline }} placeholder="同一函数的第二个实例" style={{ width: 200 }} />
        </Space>
      </Item>

      <Item
        label="内联箭头函数"
        hint="每次渲染都是新引用，来源键跟着变，缓存永远不命中；开发态控制台会告警"
      >
        <Space wrap>
          <BizSelect
            source={{ load: () => fetchCurrencyInline() }}
            placeholder="每次渲染换一次键"
            style={{ width: 180 }}
          />
          <Button size="small" onClick={() => setTick((value) => value + 1)}>
            触发一次重渲染（{tick}）
          </Button>
        </Space>
      </Item>

      <Item label="显式 cacheKey" hint="内联源确实要共享时，用 cacheKey 兜底">
        <Space wrap>
          <BizSelect
            source={{ load: () => fetchCurrencyInline() }}
            cacheKey="inline-currency"
            placeholder="两个实例共享同一份缓存"
            style={{ width: 200 }}
          />
          <BizSelect
            source={{ load: () => fetchCurrencyInline() }}
            cacheKey="inline-currency"
            placeholder="第二个实例"
            style={{ width: 160 }}
          />
        </Space>
      </Item>

      <Alert
        type="warning"
        showIcon
        message="schema 里不能内联"
        description="schema 是数据，要能序列化、存后端、被生成，所以 source 只能写注册名；函数一律在注册表里。"
      />
    </Space>
  );
}

// ---------------------------------------------------------------------------
// 页面
// ---------------------------------------------------------------------------

export default function BizSelectScenariosDemo() {
  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="BizSelect 全场景对照"
        description="按 API 预览文档的顺序逐条落地：标量直用 → schema 配置 → 表格行内 → 对象值 → 辅助能力 → 内联源。"
      />

      <Section title="一、标量值：直接使用" desc="值是编码，名称由数据源解析；三种来源只是工厂不同。">
        <ScalarDirect />
      </Section>

      <Section
        title="二、标量值：schema 配置"
        desc="paramsFrom 在渲染前编译成 dynamic + linkage，表单引擎零改动；父变自动清空，clearOnParent: false 可关闭。"
      >
        <SchemaScalar />
      </Section>

      <Section title="三、标量值：表格行内" desc="每行一个独立 Form，ctx.get 在本行解析，声明与表单里完全一样。">
        <TableRowDemo />
      </Section>

      <Section title="四、对象值" desc="名称随值存取，不需要 resolve；提交时拆两列，回显时合成一个对象。">
        <ObjectValues />
      </Section>

      <Section title="五、对象值：schema 配置" desc="valueMode + valueFields 照旧；父字段是对象时，用 paramsFrom 的 { from, pick } 取子键当参数，整值映射还是写成字段名。">
        <SchemaObject />
      </Section>

      <Section title="六、辅助能力" desc="失效重取、候选取它用、只读展示。">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Item label="失效重取（invalidateSelectSource）">
            <InvalidateDemo />
          </Item>
          <Item label="同一份候选给别的 UI 用（useCandidates）">
            <CandidatesPeek />
          </Item>
          <Item label="只读展示（BizSelectDisplay）">
            <DisplayDemo />
          </Item>
        </Space>
      </Section>

      <Section
        title="七、内联源"
        desc="简单场景不注册也能用；想跨实例共享缓存，靠纯数据、稳定函数引用或显式 cacheKey。"
      >
        <InlineDemo />
      </Section>
    </div>
  );
}
