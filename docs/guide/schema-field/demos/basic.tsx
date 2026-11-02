import { useState } from 'react';
import { Divider, Space, Switch, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { SchemaField } from '@tianyr/schema-antd';

const PROVINCES = [
  { value: 'zj', label: '浙江' },
  { value: 'js', label: '江苏' },
  { value: 'gd', label: '广东' },
];

export default function BasicDemo() {
  const [readOnly, setReadOnly] = useState(false);
  const [name, setName] = useState('杭州西湖商贸有限公司');
  const [province, setProvince] = useState<string>('zj');
  const [quantity, setQuantity] = useState<number>(10);
  const [deliveryDate, setDeliveryDate] = useState<Dayjs>();

  const mode = readOnly ? 'read' : 'edit';

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <span>只读</span>
        <Switch checked={readOnly} onChange={setReadOnly} />
      </Space>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Typography.Text type="secondary">Input</Typography.Text>
          <SchemaField
            schema={{ type: 'Input', props: { placeholder: '请输入名称' } }}
            value={name}
            onChange={(next) => setName(next as string)}
            mode={mode}
          />
        </div>

        <div>
          <Typography.Text type="secondary">Select（只读时按 options 解析 label）</Typography.Text>
          <SchemaField
            schema={{ type: 'Select', props: { options: PROVINCES } }}
            value={province}
            onChange={(next) => setProvince(next as string)}
            mode={mode}
          />
        </div>

        <div>
          <Typography.Text type="secondary">InputNumber</Typography.Text>
          <SchemaField
            schema={{ type: 'InputNumber', props: { min: 1, style: { width: 200 } } }}
            value={quantity}
            onChange={(next) => setQuantity(next as number)}
            mode={mode}
          />
        </div>

        <div>
          <Typography.Text type="secondary">DatePicker</Typography.Text>
          <SchemaField
            schema={{ type: 'DatePicker', props: { format: 'YYYY-MM-DD' } }}
            value={deliveryDate}
            onChange={(next) => setDeliveryDate(next as Dayjs | undefined)}
            mode={mode}
          />
        </div>
      </Space>

      <Divider />

      <Typography.Text type="secondary">
        SchemaField 只是一个受控控件，不处理 name / label / rules，也不持有表单状态。
        上面每个字段的值都存在组件自己的 state 里。
      </Typography.Text>
    </>
  );
}
