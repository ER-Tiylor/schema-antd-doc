/**
 * 示例⑪：送货明细 —— 全行常驻编辑（FullEditableTable）。
 *
 * 和⑩同一份业务、同一套列，只换表格组件，便于对照两种编辑模型：
 *   单活动行：整表一个 Form，同一时刻只挂一行，逐行保存；
 *   全行常驻：每行一个 Form，所有行同时可编辑，整表校验后一起提交，支持行内插入。
 *
 * 列覆盖的联动场景与⑩完全一致：
 *   A 显隐 / B 赋值（默认值、置空、联合计算、同步值）/ C 禁用 /
 *   D 级联读取其他字段 / E 动态必填 / F 选项动态（变化、减少、新增、部分禁用）。
 *
 * 引入方式（最佳实践）：
 *   1. 表格、列类型都从主入口 `@tianyr/schema-antd` 拿，类型单独 `import type`；
 *   2. 业务下拉（BizSelect 一族）是可选能力，走子路径 `@tianyr/schema-antd/biz-select`；
 *      字段类型要显式 `registerBizSelectField()` 注册一次，包默认不带副作用；
 *   3. 只引真正用到的符号，不要 `import * as`。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Divider, Space, Switch, Typography, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { FullEditableTable } from '@tianyr/schema-antd';
import type { EditableColumn, FullEditableTableRef } from '@tianyr/schema-antd';
import { registerBizSelectField, remote } from '@tianyr/schema-antd/biz-select';

// BizSelect 默认不注册：schema 里写 type: 'BizSelect' 之前显式注册一次
registerBizSelectField();

interface DeliveryRow {
  id: string;
  receiver?: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  customerId?: string;
  deliveryType?: string;
  product?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  deliveryDate?: Dayjs;
  deliverySlot?: Dayjs;
  needInvoice?: boolean;
  invoiceTitle?: string;
  extras?: string[];
  remark?: string;
}

type Option = { value: string; label: string; disabled?: boolean };
type ProductOption = Option & { price: number; category: 'fresh' | 'appliance' | 'other' };

const PROVINCES: Option[] = [
  { value: 'zj', label: '浙江' },
  { value: 'js', label: '江苏' },
  { value: 'gd', label: '广东' },
];

/** D：城市选项由省份算出来 */
const CITIES: Record<string, Option[]> = {
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
    { value: 'dg', label: '东莞' },
  ],
};

/** D：区县选项由城市算出来 */
const DISTRICTS: Record<string, Option[]> = {
  hz: [
    { value: 'xihu', label: '西湖区' },
    { value: 'binjiang', label: '滨江区' },
    { value: 'yuhang', label: '余杭区' },
  ],
  nb: [
    { value: 'haishu', label: '海曙区' },
    { value: 'yinzhou', label: '鄞州区' },
  ],
  nj: [
    { value: 'xuanwu', label: '玄武区' },
    { value: 'jianye', label: '建邺区' },
  ],
  sz: [
    { value: 'gusu', label: '姑苏区' },
    { value: 'wuzhong', label: '吴中区' },
  ],
  gz: [
    { value: 'tianhe', label: '天河区' },
    { value: 'panyu', label: '番禺区' },
  ],
  dg: [
    { value: 'nancheng', label: '南城区' },
    { value: 'dongcheng', label: '东城区' },
  ],
};

/**
 * 客户：候选在「接口」里，而且只有编码时要能还原名称 —— 这正是 BizSelect 的地盘。
 *
 * 换成普通 Select 的话，这里要自己写三件 Select 不负责的事：
 *   1. 按省份异步取候选（dynamic.props 是同步派生的，塞不进请求）；
 *   2. 管理加载态与竞态；
 *   3. 回填只有编码时，再查一次名称。
 * BizSelect 用 `remote({ recordFields, search, resolve })` 一次声明，这三件都由组件接管。
 *
 * `search` / `resolve` 的第二个参数就是行里的 `params`，所以「按省份查」不需要额外代码。
 */
interface CustomerRecord {
  id: string;
  name: string;
  province: string;
}

const CUSTOMERS: CustomerRecord[] = [
  { id: 'c-zj-1', name: '杭州西湖商贸有限公司', province: 'zj' },
  { id: 'c-zj-2', name: '宁波港口物资有限公司', province: 'zj' },
  { id: 'c-js-1', name: '南京金陵百货有限公司', province: 'js' },
  { id: 'c-js-2', name: '苏州工业园区供应链有限公司', province: 'js' },
  { id: 'c-gd-1', name: '广州南方食品有限公司', province: 'gd' },
];

const customerSource = remote({
  // 后端记录字段名 → 契约 { value, label }，只在入口映射一次
  recordFields: { value: 'id', label: 'name' },
  // 关键词交给「后端」：演示里用 200ms 延迟模拟一次网络往返
  search: async (keyword, params) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const province = String(params.province ?? '');
    return CUSTOMERS.filter(
      (item) => item.province === province && (!keyword || item.name.includes(keyword)),
    );
  },
  // 只有编码时按值回显名称：只读态、详情回填都走这里
  resolve: async (value, params) => {
    const province = String(params.province ?? '');
    return CUSTOMERS.find((item) => item.id === value && item.province === province) ?? null;
  },
  // 参数不齐不发请求：没选省份时直接 blocked，而不是去查全量
  requiredParams: ['province'],
});

/** F：商品选项按省份给 —— 有新增、有减少，缺货的那条直接禁用 */
const PRODUCTS: Record<string, ProductOption[]> = {
  zj: [
    { value: 'tea', label: '龙井茶（缺货）', price: 120, category: 'other', disabled: true },
    { value: 'silk', label: '丝绸礼盒', price: 260, category: 'other' },
    { value: 'kettle', label: '电热水壶', price: 99, category: 'appliance' },
  ],
  js: [
    { value: 'crab', label: '大闸蟹（缺货）', price: 300, category: 'fresh', disabled: true },
    { value: 'silk', label: '丝绸礼盒', price: 260, category: 'other' },
    { value: 'cooker', label: '电饭煲', price: 399, category: 'appliance' },
  ],
  gd: [
    { value: 'lychee', label: '荔枝礼盒', price: 150, category: 'fresh' },
    { value: 'tea2', label: '陈皮茶', price: 88, category: 'other' },
    { value: 'fan', label: '电风扇', price: 199, category: 'appliance' },
  ],
};

function productOptions(province: unknown): ProductOption[] {
  return PRODUCTS[String(province ?? '')] ?? [];
}

function findProduct(province: unknown, product: unknown): ProductOption | undefined {
  return productOptions(province).find((item) => item.value === product);
}

/** F：江苏多一个「当日达」、广东只有快递 —— 选项随省份新增与减少 */
function deliveryTypeOptions(province: unknown): Option[] {
  if (province === 'zj') {
    return [
      { value: 'express', label: '快递' },
      { value: 'pickup', label: '门店自提' },
    ];
  }
  if (province === 'js') {
    return [
      { value: 'express', label: '快递' },
      { value: 'sameDay', label: '当日达' },
      { value: 'pickup', label: '门店自提' },
    ];
  }
  return [{ value: 'express', label: '快递' }];
}

/** F：生鲜才有「保鲜」、家电才有「上门安装」；自提时后两项不可选 */
function extraOptions(product: ProductOption | undefined, deliveryType: unknown): Option[] {
  const options: Option[] = [];
  if (product?.category === 'fresh') {
    options.push({ value: 'fresh', label: '保鲜' });
  }
  if (product?.category === 'appliance') {
    options.push({ value: 'install', label: '上门安装', disabled: deliveryType === 'pickup' });
  }
  options.push({ value: 'check', label: '开箱验货', disabled: deliveryType === 'pickup' });
  return options;
}

const columns: EditableColumn<DeliveryRow>[] = [
  {
    title: '收货人',
    dataIndex: 'receiver',
    width: 110,
    editable: true,
    field: {
      name: 'receiver',
      type: 'Input',
      props: { placeholder: '姓名' },
      rules: [{ required: true, message: '请填写收货人' }],
    },
  },
  {
    title: 'E · 手机号（规则随配送方式换）',
    dataIndex: 'phone',
    width: 220,
    editable: true,
    field: {
      name: 'phone',
      type: 'Input',
      props: { placeholder: '快递填手机号，自提填座机' },
      dynamic: {
        dependencies: ['deliveryType'],
        // E 动态校验规则：不是只开关必填，整组 rules 都随配送方式替换
        rules: ({ get }) => {
          const pickup = get('deliveryType') === 'pickup';
          return [
            { required: true, message: '请填写联系电话' },
            pickup
              ? { pattern: /^0\d{2,3}-?\d{7,8}$/, message: '自提请填座机号，例如 0571-88886666' }
              : { pattern: /^1[3-9]\d{9}$/, message: '快递请填 11 位手机号' },
          ];
        },
      },
    },
  },
  {
    title: 'D · 省份（下面几列的源头）',
    dataIndex: 'province',
    width: 180,
    editable: true,
    field: {
      name: 'province',
      type: 'Select',
      props: { options: PROVINCES, placeholder: '请选择' },
      rules: [{ required: true, message: '请选择省份' }],
      linkage: [
        {
          dependencies: ['province'],
          // B 置空：换了省，城市 / 区县 / 商品 / 配送方式都是旧的，一批写完
          handler: ({ setValues }) => {
            setValues({
              city: undefined,
              district: undefined,
              customerId: undefined,
              product: undefined,
              unitPrice: undefined,
              deliveryType: undefined,
              deliverySlot: undefined,
              extras: [],
              // 程序写值不会再触发下一轮联动，金额顺手一起结算
              amount: 0,
            });
          },
        },
      ],
    },
  },
  {
    title: 'D · 城市（选项由省份算）',
    dataIndex: 'city',
    width: 170,
    editable: true,
    field: {
      name: 'city',
      type: 'Select',
      dynamic: {
        dependencies: ['province'],
        props: ({ get }) => ({
          options: CITIES[String(get('province') ?? '')] ?? [],
          placeholder: get('province') ? '请选择' : '先选省份',
        }),
        disabled: ({ get }) => !get('province'),
      },
      rules: [{ required: true, message: '请选择城市' }],
      linkage: [{ dependencies: ['city'], handler: ({ set }) => set('district', undefined) }],
    },
  },
  {
    title: 'D · 区县（选项由城市算）',
    dataIndex: 'district',
    width: 170,
    editable: true,
    field: {
      name: 'district',
      type: 'Select',
      dynamic: {
        dependencies: ['city'],
        props: ({ get }) => ({
          options: DISTRICTS[String(get('city') ?? '')] ?? [],
          placeholder: get('city') ? '请选择' : '先选城市',
        }),
        disabled: ({ get }) => !get('city'),
      },
      rules: [{ required: true, message: '请选择区县' }],
    },
  },
  {
    title: 'D/F · 客户（BizSelect：按省份查接口）',
    dataIndex: 'customerId',
    width: 250,
    editable: true,
    field: {
      name: 'customerId',
      type: 'BizSelect',
      // 列 field 的类型是 AnyFormFieldSchema，BizSelect 的专有键写进 props；
      // 表单 schema 里这些键可以直接写顶层
      props: {
        source: customerSource,
        placeholder: '先选省份',
        blockedText: '请先选择省份',
      },
      dynamic: {
        dependencies: ['province'],
        // 查询参数由同行其他字段算出来，换省会重新查
        props: ({ get }) => ({ params: { province: get('province') } }),
        disabled: ({ get }) => !get('province'),
      },
      rules: [{ required: true, message: '请选择客户' }],
    },
  },
  {
    title: 'F · 配送方式（选项随省份增减）',
    dataIndex: 'deliveryType',
    width: 230,
    editable: true,
    field: {
      name: 'deliveryType',
      type: 'RadioGroup',
      dynamic: {
        dependencies: ['province'],
        props: ({ get }) => ({ options: deliveryTypeOptions(get('province')) }),
        disabled: ({ get }) => !get('province'),
      },
      rules: [{ required: true, message: '请选择配送方式' }],
      linkage: [
        {
          dependencies: ['deliveryType'],
          // B 置空：改成自提以后，送达时段没有意义
          handler: ({ get, set }) => {
            if (get('deliveryType') === 'pickup') set('deliverySlot', undefined);
          },
        },
      ],
    },
  },
  {
    title: 'F · 商品（按省份给，缺货禁用）',
    dataIndex: 'product',
    width: 210,
    editable: true,
    field: {
      name: 'product',
      type: 'Select',
      dynamic: {
        dependencies: ['province'],
        props: ({ get }) => ({
          options: productOptions(get('province')),
          placeholder: get('province') ? '请选择' : '先选省份',
        }),
        disabled: ({ get }) => !get('province'),
      },
      rules: [{ required: true, message: '请选择商品' }],
      linkage: [
        {
          dependencies: ['product'],
          handler: ({ get, setValues }) => {
            const product = findProduct(get('province'), get('product'));
            const quantity = Number(get('quantity') ?? 0);
            // 换了商品，增值服务里已经不存在的项要摘掉
            const allowed = extraOptions(product, get('deliveryType'))
              .filter((option) => !option.disabled)
              .map((option) => option.value);
            const current = (get('extras') as string[] | undefined) ?? [];
            setValues({
              // B 同步值：选中商品后，把商品自带的单价带过来；
              // 金额不靠联动重算，这里一起算好（程序写值不会触发下一轮联动）
              unitPrice: product?.price,
              amount: Number((quantity * Number(product?.price ?? 0)).toFixed(2)),
              extras: current.filter((value) => allowed.includes(value)),
            });
          },
        },
      ],
    },
  },
  {
    title: 'E · 数量（生鲜/家电限购）',
    dataIndex: 'quantity',
    width: 200,
    editable: true,
    field: {
      name: 'quantity',
      type: 'InputNumber',
      props: { min: 1, precision: 0 },
      dynamic: {
        dependencies: ['province', 'product'],
        // E 动态校验规则：自定义 validator，上限跟着商品类别走
        rules: ({ get }) => {
          const product = findProduct(get('province'), get('product'));
          const limit = product?.category === 'fresh' ? 20 : product?.category === 'appliance' ? 5 : 0;
          return [
            { required: true, message: '请填写数量' },
            ...(limit
              ? [
                  {
                    validator: (_rule: unknown, value: unknown) =>
                      !value || Number(value) <= limit
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error(`${product?.label ?? '该商品'}单次最多 ${limit} 件`),
                          ),
                  },
                ]
              : []),
          ];
        },
      },
    },
  },
  {
    title: 'C · 单价（选了商品才可改）',
    dataIndex: 'unitPrice',
    width: 170,
    editable: true,
    field: {
      name: 'unitPrice',
      type: 'InputNumber',
      props: { min: 0, precision: 2, addonBefore: '¥' },
      dynamic: {
        dependencies: ['product'],
        disabled: ({ get }) => !get('product'),
      },
    },
  },
  {
    title: 'B · 金额（数量 × 单价，自动算）',
    dataIndex: 'amount',
    width: 200,
    editable: true,
    field: {
      name: 'amount',
      type: 'InputNumber',
      // 金额由公式决定，恒不可改
      props: { precision: 2, addonBefore: '¥', disabled: true },
      linkage: [
        {
          dependencies: ['quantity', 'unitPrice'],
          // immediate：进入页面、新增行、程序赋值也重算
          immediate: true,
          handler: ({ get, set }) => {
            const amount = Number(get('quantity') ?? 0) * Number(get('unitPrice') ?? 0);
            set('amount', Number(amount.toFixed(2)));
          },
        },
      ],
    },
  },
  {
    title: '送达日期',
    dataIndex: 'deliveryDate',
    width: 160,
    editable: true,
    field: {
      name: 'deliveryDate',
      type: 'DatePicker',
      props: { format: 'YYYY-MM-DD', placeholder: '选日期', style: { width: '100%' } },
      rules: [{ required: true, message: '请选择送达日期' }],
    },
  },
  {
    title: 'C · 送达时段（自提不需要）',
    dataIndex: 'deliverySlot',
    width: 190,
    editable: true,
    field: {
      name: 'deliverySlot',
      type: 'TimePicker',
      props: { format: 'HH:mm', placeholder: '选时段', style: { width: '100%' } },
      dynamic: {
        dependencies: ['deliveryType'],
        disabled: ({ get }) => get('deliveryType') === 'pickup',
      },
    },
  },
  {
    title: '需要发票',
    dataIndex: 'needInvoice',
    width: 110,
    editable: true,
    field: {
      name: 'needInvoice',
      type: 'Checkbox',
      linkage: [
        {
          dependencies: ['needInvoice'],
          // B 置空：取消勾选后抬头没意义了
          handler: ({ get, set }) => {
            if (!get('needInvoice')) set('invoiceTitle', undefined);
          },
        },
      ],
    },
  },
  {
    title: 'A/E · 发票抬头（勾选后出现且必填）',
    dataIndex: 'invoiceTitle',
    width: 230,
    editable: true,
    field: {
      name: 'invoiceTitle',
      label: '发票抬头',
      type: 'Input',
      props: { placeholder: '开票名称' },
      dynamic: {
        dependencies: ['needInvoice'],
        // A 显隐：隐藏时单元格留空，值还在，只是不参与校验
        visible: ({ get }) => Boolean(get('needInvoice')),
        // E 动态必填：和显隐同一个条件
        required: ({ get }) => Boolean(get('needInvoice')),
      },
    },
  },
  {
    title: 'F · 增值服务（选项随商品 / 配送方式）',
    dataIndex: 'extras',
    width: 260,
    editable: true,
    field: {
      name: 'extras',
      type: 'CheckboxGroup',
      dynamic: {
        dependencies: ['province', 'product', 'deliveryType'],
        props: ({ get }) => ({
          options: extraOptions(findProduct(get('province'), get('product')), get('deliveryType')),
        }),
      },
    },
  },
  {
    title: 'E · 备注（金额超 1000 必填）',
    dataIndex: 'remark',
    width: 210,
    editable: true,
    field: {
      name: 'remark',
      label: '备注',
      type: 'Input',
      props: { placeholder: '选填' },
      dynamic: {
        dependencies: ['amount'],
        required: ({ get }) => Number(get('amount') ?? 0) > 1000,
      },
    },
  },
];

/** 新增行的 id 序列，避免同一毫秒内生成重复 key */
let newRowSeq = 0;

function createEmptyRow(): Partial<DeliveryRow> {
  newRowSeq += 1;
  return {
    id: `new-${newRowSeq}`,
    quantity: 1,
    // B 默认值：新行直接给好明天上午 9 点
    deliveryDate: dayjs().add(1, 'day'),
    deliverySlot: dayjs().hour(9).minute(0).second(0).millisecond(0),
    needInvoice: false,
    extras: [],
  };
}

/** initialRows 只在初始化与 setData 时读取，模块级常量保证引用稳定 */
const INITIAL_ROWS: DeliveryRow[] = [
  {
    id: 'd1',
    receiver: '张三',
    phone: '13800000001',
    province: 'zj',
    city: 'hz',
    district: 'xihu',
    customerId: 'c-zj-1',
    deliveryType: 'express',
    product: 'silk',
    quantity: 2,
    unitPrice: 260,
    amount: 520,
    deliveryDate: dayjs().add(1, 'day'),
    deliverySlot: dayjs().hour(9).minute(0).second(0).millisecond(0),
    needInvoice: true,
    invoiceTitle: '杭州某某商贸有限公司',
    extras: ['check'],
    remark: '',
  },
  {
    id: 'd2',
    receiver: '李四',
    phone: '025-88886666',
    province: 'js',
    city: 'nj',
    district: 'xuanwu',
    customerId: 'c-js-1',
    deliveryType: 'pickup',
    product: 'cooker',
    quantity: 1,
    unitPrice: 399,
    amount: 399,
    deliveryDate: dayjs().add(2, 'day'),
    needInvoice: false,
    extras: ['check'],
    remark: '',
  },
];

export default function DeliveryFullDemo() {
  const tableRef = useRef<FullEditableTableRef<DeliveryRow>>(null);
  const [snapshot, setSnapshot] = useState<DeliveryRow[]>([]);
  const [readOnly, setReadOnly] = useState(false);

  const refresh = useCallback(() => {
    setSnapshot(tableRef.current?.getDataSync() ?? []);
  }, []);

  useEffect(() => {
    // 首帧之后 ref 才就绪
    refresh();
  }, [refresh]);

  // 联动写值发生在本次变更之后，等一拍再读，底部拿到的就是最终结果
  const handleRowValuesChange = useCallback(() => {
    setTimeout(refresh, 0);
  }, [refresh]);

  // 整表校验通过后回调；真实项目在这里调提交接口
  const handleSubmit = useCallback((rows: DeliveryRow[]) => {
    message.success(`提交成功，共 ${rows.length} 行`);
    // eslint-disable-next-line no-console
    console.log('[delivery-full] submit', rows);
  }, []);

  return (
    <div>
      <Typography.Title level={4}>送货明细 · 全行常驻编辑（FullEditableTable）</Typography.Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="同一份业务、同一套列，换成每行一个 Form：所有行同时可编辑，支持行内插入"
        description="联动场景与⑩一致：选省份 → 城市 / 区县 / 商品 / 配送方式跟着变；选商品 → 单价自动带出，金额实时算；配送方式选「门店自提」→ 送达时段禁用并清空；勾「需要发票」→ 发票抬头出现且必填；金额超过 1000 → 备注必填；换商品 → 增值服务的选项跟着换；「客户」是 BizSelect，候选来自接口、按省份查；「手机号」整组规则随配送方式替换（快递要手机号、自提要座机），「数量」用自定义 validator（生鲜最多 20 件、家电最多 5 件）。区别在于：每行都有自己的 Form，可以同时编辑多行，行尾默认带「插入 / 删除」，整表点「校验」一次性过校验。"
      />

      <Alert
        type="success"
        showIcon
        style={{ marginBottom: 16 }}
        message="同一个「候选下拉」，什么时候用 BizSelect，什么时候用 Select"
        description={
          <>
            <div>
              ① 候选在接口里、要关键词搜索、只有编码时还要还原名称 → <b>BizSelect</b>：
              一行 <code>remote(&#123; recordFields, search, resolve &#125;)</code>，
              候选 / 搜索 / 回显 / 缓存 / 参数门禁都由组件接管。本页「客户」就是这种。
            </div>
            <div>
              ② 候选是前端常量或字典、或者选项由其他字段直接算出来 → <b>Select</b>：
              一个 <code>options</code> 就够，上 BizSelect 反而多一层请求与状态。本页「商品」「城市」都是这种。
            </div>
            <div style={{ marginTop: 4 }}>
              判断标准不是「哪个更强」，而是<b>候选从哪来</b>：能同步拿到就用 Select，拿不到才交给 BizSelect。
            </div>
          </>
        }
      />

      <Space style={{ marginBottom: 12 }}>
        <Space size={4}>
          <span>只读模式</span>
          <Switch checked={readOnly} onChange={setReadOnly} />
        </Space>
        <Button
          type="primary"
          onClick={async () => {
            const result = await tableRef.current?.validate();
            if (!result) return;
            if (result.valid) message.success(`校验通过，共 ${result.rows.length} 行`);
            else message.error(`校验失败 ${result.errors.length} 处`);
          }}
        >
          校验
        </Button>
        <Button onClick={refresh}>刷新下方数据</Button>
        <Button
          onClick={() => {
            // setData 会重建行身份并覆盖未提交输入（dynamic 重算，不触发 linkage）
            tableRef.current?.setData(INITIAL_ROWS.map((row) => ({ ...row })));
          }}
        >
          重置数据（setData）
        </Button>
      </Space>

      <FullEditableTable<DeliveryRow>
        ref={tableRef}
        rowKey="id"
        columns={columns}
        initialRows={INITIAL_ROWS}
        disabled={readOnly}
        scroll={{ x: 3200 }}
        maxHeight={420}
        // 新增 / 行内插入 / 行内删除都默认开启，这里只改一下操作列固定在右侧
        actionColumnProps={{ fixed: 'right' }}
        createRow={createEmptyRow}
        onRowValuesChange={handleRowValuesChange}
        // 增 / 插 / 删 / 批量删除都会走这里
        onRowsStructureChange={refresh}
        onSubmit={handleSubmit}
      />

      <Divider />

      <Typography.Title level={5}>当前数据</Typography.Title>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message="全行常驻表格的数据都在各行的 Form 里"
        description="下面的内容来自 getDataSync()：按行序读取每行 Form 的当前值，并合并没有映射到表单的原始字段。改任何一格都会自动刷新，也可以点上面的「刷新下方数据」手动再读一次。"
      />
      <pre
        style={{
          margin: 0,
          padding: 12,
          maxHeight: 320,
          overflow: 'auto',
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </div>
  );
}
