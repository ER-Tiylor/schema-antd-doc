import { Button, Form, Space, message } from 'antd';
import { SchemaForm } from '@tianyr/schema-antd';
import type { FormFieldSchema } from '@tianyr/schema-antd';

const CONTRACT_TYPES = [
  { value: 'standard', label: '标准合同' },
  { value: 'framework', label: '框架合同' },
  { value: 'supplement', label: '补充协议' },
];

const PROVINCES = [
  { value: 'zj', label: '浙江' },
  { value: 'js', label: '江苏' },
];

const CITY_MAP: Record<string, { value: string; label: string }[]> = {
  zj: [
    { value: 'hz', label: '杭州' },
    { value: 'nb', label: '宁波' },
  ],
  js: [
    { value: 'nj', label: '南京' },
    { value: 'sz', label: '苏州' },
  ],
};

const schema: FormFieldSchema[] = [
  {
    name: 'contractType',
    label: '合同类型',
    type: 'Select',
    props: { options: CONTRACT_TYPES },
    rules: [{ required: true, message: '请选择合同类型' }],
  },
  {
    // 只在「补充协议」下出现，且出现时必填
    name: 'supplementNo',
    label: '补充协议号',
    type: 'Input',
    dynamic: {
      dependencies: ['contractType'],
      visible: ({ get }) => get('contractType') === 'supplement',
      required: ({ get }) => get('contractType') === 'supplement',
    },
  },
  {
    name: 'quantity',
    label: '数量',
    type: 'InputNumber',
    props: { min: 1, style: { width: '100%' } },
  },
  {
    name: 'price',
    label: '单价',
    type: 'InputNumber',
    props: { min: 0, precision: 2, style: { width: '100%' } },
  },
  {
    // 联动计算：用户改数量或单价时重算；immediate 让初始化 / 程序赋值也重算
    name: 'totalAmount',
    label: '总价（自动计算）',
    type: 'InputNumber',
    props: { disabled: true, addonAfter: '元', style: { width: '100%' } },
    linkage: [
      {
        dependencies: ['quantity', 'price'],
        immediate: true,
        handler: ({ get, set }) => {
          set('totalAmount', Number(get('quantity') ?? 0) * Number(get('price') ?? 0));
        },
      },
    ],
  },
  {
    // 选项由省份算出来；换省时清掉不匹配的城市
    name: 'province',
    label: '省份',
    type: 'Select',
    props: { options: PROVINCES },
  },
  {
    name: 'city',
    label: '城市（选项随省份变化）',
    type: 'Select',
    dynamic: {
      dependencies: ['province'],
      disabled: ({ get }) => !get('province'),
      props: ({ get }) => ({
        options: CITY_MAP[String(get('province') ?? '')] ?? [],
        placeholder: get('province') ? '请选择' : '先选省份',
      }),
    },
    linkage: [
      {
        dependencies: ['province'],
        handler: ({ get, set }) => {
          const options = CITY_MAP[String(get('province') ?? '')] ?? [];
          const current = get('city');
          if (current !== undefined && !options.some((option) => option.value === current)) {
            set('city', undefined);
          }
        },
      },
    ],
  },
  {
    // 动态必填：总价超过 50 万时备注必填
    name: 'remark',
    label: '备注（总价 > 50 万时必填）',
    type: 'Input.TextArea',
    props: { rows: 2 },
    dynamic: {
      dependencies: ['totalAmount'],
      required: ({ get }) => Number(get('totalAmount') ?? 0) > 500000,
    },
    colSpan: 2,
  },
];

const initialValues = {
  contractType: 'standard',
  quantity: 1,
  price: 100,
  province: undefined,
};

export default function BasicDemo() {
  const [form] = Form.useForm();

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button
          type="primary"
          onClick={() => {
            form
              .validateFields()
              .then(() => message.success('校验通过'))
              .catch((error) => message.error(`校验失败 ${error?.errorFields?.length ?? 0} 处`));
          }}
        >
          校验
        </Button>
        <Button
          onClick={() => {
            // 程序赋值：非 immediate 的联动不跑，总价的 immediate 规则会重算
            form.setFieldsValue({ quantity: 2000, price: 300 });
          }}
        >
          回填数量 / 单价
        </Button>
        <Button onClick={() => form.resetFields()}>重置</Button>
      </Space>

      <SchemaForm
        form={form}
        schema={schema}
        columns={2}
        initialValues={initialValues}
        onFinish={(values) => {
          // eslint-disable-next-line no-console
          console.log(values);
        }}
      />
    </>
  );
}
