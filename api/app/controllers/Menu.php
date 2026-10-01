<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class Menu extends Controller
{
    private $api;
    private $categories;
    private $items;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->categories = $this->call->model('CategoryModel');
        $this->items = $this->call->model('MenuModel');
    }

    #[Get('/menu')]
    public function index()
    {
        $categories = $this->categories->query()
            ->select('id,name,sort_order,is_active,created_at')
            ->order_by('sort_order', 'ASC')
            ->get_all();
        $items = $this->items->query()
            ->select('id,category_id,name,description,price,image_url,is_available,stock_quantity,created_at,updated_at')
            ->order_by('name', 'ASC')
            ->get_all();

        $this->success([
            'categories' => array_map([$this, 'format_category'], $categories ?: []),
            'items' => array_map([$this, 'format_item'], $items ?: []),
        ]);
    }

    #[Post('/menu-items')]
    public function create_item()
    {
        $input = $this->api->body();
        $data = $this->validate_item($input);
        $id = $this->uuid();
        $created = $this->items->insert(array_merge(['id' => $id], $data));
        if ($created === false) {
            $this->api->respond_error('Could not create menu item.', 500);
        }

        $this->success(['item' => $this->format_item($this->items->find($id))], 201);
    }

    #[Put('/menu-items/{id:uuid}')]
    public function update_item($id)
    {
        if (!$this->items->find($id)) {
            $this->api->respond_error('Menu item not found.', 404);
        }
        $input = $this->api->body();
        $changes = $this->validate_item($input, true);
        if (!$changes) {
            $this->api->respond_error('No menu item fields were provided.', 422);
        }

        $this->items->query()->where('id', $id)->update(array_merge($changes, ['updated_at' => date('Y-m-d H:i:s')]));
        $this->success(['item' => $this->format_item($this->items->find($id))]);
    }

    #[Delete('/menu-items/{id:uuid}')]
    public function delete_item($id)
    {
        if (!$this->items->find($id)) {
            $this->api->respond_error('Menu item not found.', 404);
        }
        $this->items->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }

    #[Post('/menu-items/upload-image')]
    public function upload_image()
    {
        if (!isset($_FILES['file'])) {
            $this->api->respond_error('Choose an image file to upload.', 422);
        }

        $directory = ROOT_DIR . PUBLIC_DIR . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'menu';
        $upload = $this->call->library('upload', $_FILES['file']);
        $uploaded = $upload
            ->allowed_extensions(['jpg', 'jpeg', 'png', 'webp'])
            ->allowed_mimes(['image/jpeg', 'image/png', 'image/webp'])
            ->is_image()
            ->max_size(5)
            ->encrypt_name()
            ->set_dir($directory)
            ->do_upload();

        if (!$uploaded) {
            $this->api->respond_error(implode(' ', $upload->get_errors()), 422);
        }

        $this->success(['url' => base_url('uploads/menu/' . $upload->get_filename())], 201);
    }

    private function validate_item($input, $partial = false)
    {
        $fields = ['categoryId', 'name', 'description', 'price', 'imageUrl', 'isAvailable', 'stockQuantity'];
        $has_fields = array_intersect($fields, array_keys($input));
        if ($partial && !$has_fields) {
            return [];
        }

        $result = [];
        $category_id = $input['categoryId'] ?? null;
        if (!$partial || array_key_exists('categoryId', $input)) {
            if (!is_string($category_id) || !$this->categories->find($category_id)) {
                $this->api->respond_error('A valid categoryId is required.', 422);
            }
            $result['category_id'] = $category_id;
        }

        if (!$partial || array_key_exists('name', $input)) {
            $name = trim((string) ($input['name'] ?? ''));
            if ($name === '' || strlen($name) > 150) {
                $this->api->respond_error('Item name is required and must be 150 characters or fewer.', 422);
            }
            $result['name'] = $name;
        }
        if (!$partial || array_key_exists('description', $input)) {
            $description = $input['description'] ?? null;
            if ($description !== null && (!is_string($description) || strlen($description) > 1000)) {
                $this->api->respond_error('Description must be 1000 characters or fewer.', 422);
            }
            $result['description'] = $description;
        }
        if (!$partial || array_key_exists('price', $input)) {
            $price = $input['price'] ?? null;
            if (!is_numeric($price) || (float) $price < 0 || (float) $price > 99999999.99) {
                $this->api->respond_error('A valid non-negative price is required.', 422);
            }
            $result['price'] = number_format((float) $price, 2, '.', '');
        }
        if (!$partial || array_key_exists('imageUrl', $input)) {
            $image_url = $input['imageUrl'] ?? null;
            $is_uploaded_image = is_string($image_url)
                && preg_match('#^/uploads/menu/[A-Za-z0-9._-]+$#D', $image_url);
            $is_external_url = is_string($image_url) && filter_var($image_url, FILTER_VALIDATE_URL);
            if ($image_url !== null && (!is_string($image_url) || strlen($image_url) > 500 || (!$is_uploaded_image && !$is_external_url))) {
                $this->api->respond_error('Image URL must be a valid URL of at most 500 characters.', 422);
            }
            $result['image_url'] = $image_url;
        }
        if (!$partial || array_key_exists('isAvailable', $input)) {
            $result['is_available'] = $this->boolean_value($input['isAvailable'] ?? true);
        }
        if (!$partial || array_key_exists('stockQuantity', $input)) {
            $quantity = $input['stockQuantity'] ?? null;
            if ($quantity !== null && (!filter_var($quantity, FILTER_VALIDATE_INT) || (int) $quantity < 0)) {
                $this->api->respond_error('Stock quantity must be a non-negative integer or null.', 422);
            }
            $result['stock_quantity'] = $quantity === null ? null : (int) $quantity;
        }

        return $result;
    }

    private function format_category($row)
    {
        return [
            'id' => (string) $row['id'],
            'name' => $row['name'],
            'sortOrder' => (int) $row['sort_order'],
            'isActive' => (bool) $row['is_active'],
            'createdAt' => $row['created_at'] ?? null,
        ];
    }

    private function format_item($row)
    {
        return [
            'id' => (string) $row['id'],
            'categoryId' => (string) $row['category_id'],
            'name' => $row['name'],
            'description' => $row['description'],
            'price' => (float) $row['price'],
            'imageUrl' => $row['image_url'],
            'isAvailable' => (bool) $row['is_available'],
            'stockQuantity' => $row['stock_quantity'] === null ? null : (int) $row['stock_quantity'],
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }

    private function boolean_value($value)
    {
        return (int) (filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false);
    }

    private function uuid()
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);

        return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    }

    private function success($data, $status = 200)
    {
        $this->api->respond(['success' => true, 'data' => $data], $status);
    }
}
